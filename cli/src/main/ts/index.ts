import {downloadKeystore, unlockKeystore} from "./keystore";
import {loadToken} from "./token";
import {scanKdbxGroup} from "./keepass";
import * as fs from 'fs';
const {promisify} = require('util');

const fsWriteFile = promisify(fs.writeFile);

const BACKEND = 'http://localhost:3001';

const localEnvFilename = `${process.env.HOME}/.para-env.rc`;

const scanKeystore = db => ['\n'].concat(...scanKdbxGroup(db)).join('\n');

const storeResult = result => fsWriteFile(localEnvFilename, result);

const onSuccess = () => console.log('source ~/.para-env.rc');

const download = token => downloadKeystore(BACKEND, token);

const fatalError = error => {
    console.error('fatal error', error);
    process.exit(1);
};

loadToken(BACKEND)
    .then(download)
    .then(unlockKeystore)
    .then(scanKeystore)
    .then(storeResult)
    .then(onSuccess)
    .catch(fatalError);
