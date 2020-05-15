const { assert, expect } = require('chai')
, { NameMapper, JaroWinklerSimilarityScorer } = require('../lib/NameMapper')
, { Record } = require('../lib/Record')
, jw = new JaroWinklerSimilarityScorer()
, nm = new NameMapper(jw).addName('Homer', 'Marge');


describe(Record.name, function() {

    it('should read lines properly', done => {
        assert.doesNotThrow(() => {
            new Record('hoomey, 5.12', nm, false, false);
        });
        assert.throws(() => {
            new Record('Homer, 5.4', nm, true, false);
        });
        assert.throws(() => {
            new Record('homer, 5 ,', nm, false, false);
        });
        assert.doesNotThrow(() => {
            new Record('Marge, 5', nm, true, true);
        });

        done();
    });
});
