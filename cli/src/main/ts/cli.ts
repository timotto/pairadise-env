export module Cli {
    export function main(args: string[]): Promise<void> {
        if (args.length<2) return Promise.reject('not enough parameters');
        args.shift();
        args.shift();

        console.log('args', args);
        return Promise.resolve()
    }

}
