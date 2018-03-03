import {Cli} from './cli';

describe('Cli', () => {
    describe('main(args)', () => {
        it('requires at least two arguments', async () => {
            await Cli.main([])
                .then(() => fail())
                .catch(e => expect(e).toBeDefined());
            await Cli.main(['one'])
                .then(() => fail())
                .catch(e => expect(e).toBeDefined());
            await Cli.main(['one', 'two']);
        });
    });
});