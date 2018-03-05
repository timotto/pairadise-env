import {deleteLocalToken, requestTokenOnline} from "./token";
import {Kdbx, CryptoEngine, Credentials, ProtectedValue} from 'kdbxweb';
import * as Prompt from 'input-promptify';
import * as request from "request";
const {promisify} = require('util');

const requestGet = promisify(request.get);

const downloadKeystore = (backend, token) =>
    requestGet(`${backend}/keystore`, createDownloadOptions(token))
        .then(response => response.statusCode === 200
            ? response.body
            : deleteLocalToken()
                .then(() => requestTokenOnline(backend))
                .then(token => downloadKeystore(backend, token)));

const unlockKeystore = keepassFileData =>
    Prompt('Keystore password> ', {replaceCharacter: '*'})
        .then(password => new Credentials(ProtectedValue.fromString(password)))
        .then(cred => Kdbx.load(Uint8Array.from(keepassFileData).buffer, cred))
        .catch(() => unlockKeystore(keepassFileData));

const createDownloadOptions = token => ({...createTokenOptions(token), encoding:null});

const createTokenOptions = token => ({headers:{'authorization': `Bearer ${token}`}});

export { downloadKeystore, unlockKeystore }
