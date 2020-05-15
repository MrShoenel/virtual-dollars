const { assert, expect } = require('chai')
, { NameMapper, JaroWinklerSimilarityScorer, LevenshteinSimilarityScorer } = require('../lib/NameMapper');



describe(NameMapper.name, function() {
    it('should map names correctly', done => {
        const nm = new NameMapper(new JaroWinklerSimilarityScorer(), 0.7, true); //minSim, useLowerCase

        nm.addName('Marge').addName('Homer').addName('Euclid').addName('Mathias').addName('Montgomery Burns');

        assert.equal(nm.getMatchedName('margerine'), 'Marge');
        assert.equal(nm.getMatchedName('Homer Simpson'), 'Homer');
        assert.equal(nm.getMatchedName('Matthias'), 'Mathias');

        assert.throws(() => {
            nm.getMatchedName('bla');
        });

        done();
    });


    it('should also work with Levenshtein distance', done => {
        // Note how the similarity is much lower (0.4 does not work for Levenshtein)
        const nm = new NameMapper(new LevenshteinSimilarityScorer(), 0.3, true); //minSim, useLowerCase

        nm.addName('Marge').addName('Homer').addName('Euclid').addName('Mathias');

        assert.equal(nm.getMatchedName('margerine'), 'Marge');
        assert.equal(nm.getMatchedName('Homer Simpson'), 'Homer');
        assert.equal(nm.getMatchedName('Matthias'), 'Mathias');

        assert.throws(() => {
            nm.getMatchedName('bla');
        });

        done();
    });

    
    it('should pick up names from files', done => {
        assert.isTrue(NameMapper.readNamesFromFilesInFolder('./test/data', 15, 'Blue').size > 1);
        done();
    });
});