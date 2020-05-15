const program = require('commander')
, path = require('path')
, fs = require('fs')
, packagePath = path.resolve(path.dirname(__filename), './package.json')
, package = JSON.parse(fs.readFileSync(packagePath))
, { NameMapper, JaroWinklerSimilarityScorer, LevenshteinSimilarityScorer } = require('./lib/NameMapper')
, { AggregateReport } = require('./lib/AggregateReport')
, { createObjectCsvWriter } = require('csv-writer');


program
  .version(`\n  This is Virtual-Dollars@v${package.version} by ${package.author}\n`, '-v, --version')
  .option('-s, --similarity <similarity>', 'Optional. The minimum score [0..1] for matching names. Defaults to 0.7.', 0.7)
  .option('-m, --name-matcher <nameMatcher>', `Optional. The similarity measure to use. Options are '${JaroWinklerSimilarityScorer.name}' and '${LevenshteinSimilarityScorer.name}'. Default is '${JaroWinklerSimilarityScorer.name}'.`, JaroWinklerSimilarityScorer.name)
  .option('-g, --group <group>', 'The name of a group. If used, files with that group are grabbed, and the members in these files\' names are used. This is only used for initializing an authoritative list of names.', null)
  .option('-w, --week <week>', 'The number of a week. If used, files with that week are grabbed, and the members in these files\' names are used. This is only used for initializing an authoritative list of names.', null)
  .requiredOption('-d, --dir <dir>', 'Required. Path to a directory with reports.')
  .requiredOption('-o, --out-file <outFile>', 'Required. The path to an output file. CSV will be written there.')
  .parse(process.argv);

const sim = program.nameMatcher === JaroWinklerSimilarityScorer.name ?
    new JaroWinklerSimilarityScorer() : new LevenshteinSimilarityScorer()
, nm = new NameMapper(sim, program.similarity)
    .addNames(NameMapper.readNamesFromFilesInFolder(program.dir, program.week, program.group))
, agg = new AggregateReport(nm).addReportsFromFolder(program.dir)
, csvW = createObjectCsvWriter({
    path: program.outFile,
    header: [{
        id: 'member',
        title: 'Member'
    }, {
        id: 'week',
        title: 'Week'
    }, {
        id: 'group',
        title: 'Group'
    }, {
        id: 'amount',
        title: 'Amount'
    }, {
        id: 'scrumsMissed',
        title: 'ScrumsMissed'
    }, {
        id: 'otherMissed',
        title: 'OtherMissed'
    }]
});



const timeout = setTimeout(() => {}, 2**30);
(async() => {
    try {
        for (const report of agg.reports) {
            await csvW.writeRecords(report.records.map(rc => {
                return {
                    member: rc.name,
                    week: report.week,
                    group: report.group,
                    amount: rc.amount,
                    scrumsMissed: rc.scrumsMissed,
                    otherMissed: rc.otherMissed
                }
            }));
        }
    } finally {
        clearTimeout(timeout);
    }
})();
