import * as fs from 'fs';
import {Kdbx, CryptoEngine, Credentials, ProtectedValue} from 'kdbxweb';

const {promisify} = require('util');

const fsReadFile = promisify(fs.readFile);

const argon2 = require('argon2');
CryptoEngine.argon2 = argon2;

const fatalError = error => {
    console.error('fatal error', error);
    process.exit(1);
};


if (process.argv.length < 2) fatalError('not enough arguments');

process.argv.shift();
process.argv.shift();

const givenPassword = 'testtesttest';
const givenFile = process.env.HOME + '/para-env-test.kdbx';

const startup = async () => {
    const cred = await new Credentials(ProtectedValue.fromString(givenPassword));
    const keepassFileData = await fsReadFile(givenFile);
    const db = await Kdbx.load(Uint8Array.from(keepassFileData).buffer, cred);

    scanKdbxGroup(db).forEach(line => console.log(line));
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
        .replace('{{.username}}', entry.fields.UserName)
        .replace('{{.password}}', maybeDecodeKdbxPassword(entry.fields.Password));

startup().catch(fatalError);
