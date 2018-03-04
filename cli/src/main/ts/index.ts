const BACKEND = 'http://localhost:3001';

import {Kdbx, CryptoEngine, Credentials, ProtectedValue} from 'kdbxweb';
const {promisify} = require('util');
import * as fs from 'fs';
import * as request from 'request';
import * as promptify from 'promptify';

const fsReadFile = promisify(fs.readFile);
const fsWriteFile = promisify(fs.writeFile);
const requestGet = promisify(request.get);
const requestPost = promisify(request.post);

const argon2 = require('argon2');
CryptoEngine.argon2 = argon2;

const main = async () => {

    const storedToken = await readToken();
    const token = storedToken
        ? storedToken
        : await requestTokenOnline();

    console.error('Downloading keystore');
    const keepassFileData = await downloadKeystore(token);
    const password = promptify('Keystore password', {char: '*'});
    const cred = await  new Credentials(ProtectedValue.fromString(password));
    const db = await Kdbx.load(Uint8Array.from(keepassFileData).buffer, cred);

    const content = scanKdbxGroup(db).join('\n') + '\n';

    await fsWriteFile(`${process.env.HOME}/.para-env.rc`, content);

    console.log('source ~/.para-env.rc');
};

const scanKdbxGroup =
    group =>
        group.groups
            .map(group => scanKdbxGroup(group))
            .reduce((a, b) => a.concat(...b), group.entries
                ? group.entries.map(entry => scanKdbxEntry(entry))
                : []);

const scanKdbxEntry =
    entry =>
        extractEnvLineCommands(entry)
            .concat(...extractEnvTemplateCommands(entry))
            .concat(...extractCreateFileCommands(entry));

const extractEnvLineCommands = entry =>
    Object.keys(entry.fields)
        .filter(key => key.startsWith('ENV:'))
        .map(key => subKey(key))
        .map(name => `${name}=${replacePlaceholderInLine(entry.fields[`ENV:${name}`], entry)}`);

const extractEnvTemplateCommands = entry =>
    Object.keys(entry.fields)
        .filter(key => key === 'ENV')
        .map(key => entry.fields[key])
        .map(text => text.split('\n'))
        .reduce((a, b) => a.concat(...b), [])
        .filter(line => line !== '')
        .map(line => replacePlaceholderInLine(line, entry));

const extractCreateFileCommands = entry =>
    Object.keys(entry.fields)
        .filter(key => key.startsWith('FILE:'))
        .map(key => ({key, bin: subKey(key)}))
        .map(o => ({...o,
            name: entry.fields[o.key],
            data: Buffer.from(entry.binaries[o.bin].value).toString()}))
        .map(o => `echo cat > ~/${o.name} << EOT\n${o.data}EOT`);

const maybeDecodeKdbxPassword =
    maybeProtectedValue =>
        maybeProtectedValue === ''
            ? ''
            : maybeProtectedValue.getText();

const subKey = key => key.split(':')[1];

const replacePlaceholderInLine = (line, entry) =>
    line
        .replace('{{.Username}}', entry.fields.UserName)
        .replace('{{.Password}}', maybeDecodeKdbxPassword(entry.fields.Password));

const readToken = () => fsReadFile(`${process.env.HOME}/.para-env.token`)
    .catch(() => undefined);

const writeToken = token => fsWriteFile(`${process.env.HOME}/.para-env.token`, token);

const deleteLocalToken = () => promisify(fs.unlink)(`${process.env.HOME}/.para-env.token`);

const login = (username, password) =>
    requestPost(`${BACKEND}/auth`, {json:{username: username, password: password}})
        .then(response => {
            if (response.statusCode !== 200) throw response.statusCode;
            return response;
        });

const requestTokenOnline = (): Promise<string> => {
    const username = promptify("Username");
    const password = promptify("Password", {char: '*'});

    return login(username, password)
        .then(response => response.body)
        .then(jsonBody => writeToken(jsonBody.token).then(() => jsonBody.token))
        .catch(error => {
            console.error(error);
            return requestTokenOnline();
        })
};

const downloadKeystore = token => requestGet(`${BACKEND}/keystore`,
    {encoding:null,headers: {'authorization': `Bearer ${token}`}})
        .then(response => {
            if (response.statusCode !== 200) {
                return deleteLocalToken()
                    .then(() => requestTokenOnline())
                    .then(token => downloadKeystore(token));
            }
            return response.body;
        })
    .then((data: Buffer) => {
        console.log(`data.length=${data.length}`);
        return fsWriteFile('fs', data).then(() => data);
    });

const fatalError = error => {
    console.error('fatal error', error);
    process.exit(1);
};

main().catch(fatalError);
