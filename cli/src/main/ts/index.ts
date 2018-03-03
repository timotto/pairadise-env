import {Cli} from "./cli";

const fatalError = error => {
    console.error('fatal error', error);
    process.exit(1);
};

Cli
    .main(process.argv)
    .catch(fatalError);
