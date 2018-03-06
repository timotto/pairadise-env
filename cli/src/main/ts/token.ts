import * as fs from "fs";
import * as request from "request";
import * as Prompt from 'input-promptify';
const {promisify} = require('util');

const requestPost = promisify(request.post);
const fsWriteFile = promisify(fs.writeFile);
const fsUnlink = promisify(fs.unlink);
const fsReadFile = promisify(fs.readFile);

const localTokenFilename = `${process.env.HOME}/.para-env.token`;

const requestTokenOnline = backend =>
    Prompt("Username> ").then(username =>
        Prompt("Password> ", {replaceCharacter: '*'}).then(password =>
            login(backend, username, password)
                .then(tokenResponseHandler)
                .catch(error => {
                    console.error(error);
                    return requestTokenOnline(backend);
                })));

const login = (backend, username, password) =>
    requestPost(`${backend}/auth`, {json:{username: username, password: password}})
        .then(loginResponseHandler);

const loginResponseHandler = response => {
    if (response.statusCode !== 200) throw response.statusCode;
    return response;
};

const tokenResponseHandler = response => writeToken(response.body.token).then(() =>
    response.body.token);

const writeToken = token => fsWriteFile(localTokenFilename, token);

const deleteLocalToken = () => fsUnlink(localTokenFilename);

const loadToken = backend => readToken().then(token =>
    token ? token : requestTokenOnline(backend));

const readToken = () => fsReadFile(localTokenFilename)
    .catch(() => undefined);

export { deleteLocalToken, requestTokenOnline, loadToken }