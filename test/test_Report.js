const { assert, expect } = require('chai')
, { NameMapper, JaroWinklerSimilarityScorer } = require('../lib/NameMapper')
, { Report } = require('../lib/Report')
, { AggregateReport } = require('../lib/AggregateReport')
, jw = new JaroWinklerSimilarityScorer();


describe(Report.name, function() {
    it('should read our test files correctly', done => {
        done();
    });
});


describe(AggregateReport.name, function() {
    it('should read all the reports into an aggregated report', done => {
        const nm = new NameMapper(jw);
        nm.addNames(NameMapper.readNamesFromFilesInFolder('./test/data'));

        const agg = new AggregateReport(nm);
        agg.addReportsFromFolder('./test/data');

        done();
    });
});