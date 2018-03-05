import * as express from 'express';
import * as bodyParser from 'body-parser';
import {Request, Response} from 'express';
import * as jwt from 'jsonwebtoken';
import * as Git from 'nodegit';
import * as fs from 'fs';
import * as rimrafCb from 'rimraf';
import {promisify} from "util";
const fsReadFile = promisify(fs.readFile);
const rimraf = promisify(rimrafCb);

const database = {};

const tokenSigningSecret = 'wow such very secret';
const tokenVerificationOptions = {algorithms: ['HS256']};
const tokenSigningOptions = {expiresIn: '15m'};

const main = () => express()
    .use(bodyParser.json())
    .post('/auth', authHandler)
    .post('/signup', signupHandler)
    .all('/keystore', keystoreHandler)
    .all('/', rootHandler)
    .listen(port, listenCallback);

const port = parseInt(process.env.PORT || '3001');

const listenCallback = () => console.log(`listening on port ${port}`);

const keystoreHandler = (req: Request, res: Response) => {
    const token = tokenFromRequest(req);
    if (token === undefined)
        return res.sendStatus(401);

    const errorHandler = error => {
        console.error(error);
        res.sendStatus(500);
    };

    const responseHandler = data => res.send(data);

    getKeystore(database[token.username])
        .then(responseHandler)
        .catch(errorHandler)
};

const signupHandler = (req: Request, res: Response) => {
    const username = req.body['username'];
    const password = req.body['password'];
    const git = req.body['git'];
    const credentials = req.body['credentials'];

    if (username === undefined || password === undefined
        || git === undefined || credentials === undefined)
        return res.sendStatus(400);

    if (database[username] !== undefined)
        return res.sendStatus(401);

    database[username] = {
        username: username,
        password: password,
        git: git,
        credentials: credentials
    };

    res.sendStatus(201);
};

const authHandler = (req: Request, res: Response) => {
    const username = req.body['username'];
    const password = req.body['password'];

    const user = database[username];
    if (user === undefined)
        return res.sendStatus(401);

    if (password !== user.password)
        return res.sendStatus(401);

    const token = jwt.sign({username: username}, tokenSigningSecret, tokenSigningOptions);
    res.json({token: token});
};

const rootHandler = (req: Request, res: Response) => {
    const token = tokenFromRequest(req);
    res.json({message: 'welcome', token: token});
};

const tokenFromRequest = (req: Request): any | undefined =>
    tokenFromTokenString(req.header('authorization'));

const tokenFromTokenString = (tokenString: string): any | undefined =>
    tokenString === undefined ? undefined :
        !tokenString.startsWith('Bearer ') ? undefined :
            jwt.verify(
                tokenString.substr('Bearer '.length),
                tokenSigningSecret,
                tokenVerificationOptions);

const getKeystore = user => {
    const tempDir = createTemp();
    const options: Git.CloneOptions = {fetchOpts:{callbacks:{
        credentials: createUserCredentialCallback(user)}}};

    const fileRead = () => fsReadFile(`${tempDir}/para-env.kdbx`);
    const cleanup = (keystore?) => rimraf(tempDir).then(() => keystore);
    const errorHandler = error => {
        const errorForwarder = () => {throw error};
        return cleanup()
            .then(errorForwarder);
    };

    return Git.Clone.clone(user.git, tempDir, options)
        .then(fileRead)
        .then(cleanup)
        .catch(errorHandler);
};

const createTemp = (): string => fs.mkdtempSync('para-env-git-');

const createUserCredentialCallback = user => user.git.startsWith('https://')
    ? () => Git.Cred.userpassPlaintextNew(
        user.credentials.split(':')[0], user.credentials.split(':')[1])
    : user.git.startsWith('ssh://')
        ? () => Git.Cred.sshKeyMemoryNew(
            'git', publicSshKey, user.credentials, '')
        : undefined;

main();

const publicSshKey = 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDzu2YKyvvKsGaYR3MolweVi9KXp8OGyAbmUo2o6LMw7zIkmJ3uPFfxKn9DLd3ljGA04fV7WH8yjiE+oVng/y5iBfQsdTHpIRYxPVx7fRIIuJf7vTX1FV5Od1q0PXJ7+DKxEAEh+hKiDlGA0lSfj/gdusI8+FhDs0+6fsKeVd5vDKZ1UNXqD4c+7hM05PWA7YTjWLGOTIwgyNy+X2FdcccUSEAMdbGjRbuMARLix/xMTG812P2buVTdUVK+FUh7o5efHoudd9WSqKoYpieCIMT7pWOR4U/v7Nhd2K9dhjT3uX8MNjf0OSeFwfUfcerpApgS92aaFP0jxTS05IIRmEnT para-env-test-key';
