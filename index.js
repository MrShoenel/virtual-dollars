const program = require('commander')
, path = require('path')
, fs = require('fs')
, packagePath = path.resolve(path.dirname(__filename), './package.json')
, package = JSON.parse(fs.readFileSync(packagePath))
, { NameMapper, JaroWinklerSimilarityScorer, LevenshteinSimilarityScorer } = require('./lib/NameMapper')
, { AggregateReport } = require('./lib/AggregateReport')
, { createObjectCsvWriter } = require('csv-writer')
, { ColoredConsoleLogger, LogLevel } = require('sh.log-client');


program
  .version(`\n  This is Virtual-Dollars@v${package.version} by ${package.author}\n`, '-v, --version')
  .option('-s, --similarity <similarity>', 'Optional. The minimum score [0..1] for matching names. Defaults to 0.7.', 0.7)
  .option('-m, --name-matcher <nameMatcher>', `Optional. The similarity measure to use. Options are '${JaroWinklerSimilarityScorer.name}' and '${LevenshteinSimilarityScorer.name}'. Default is '${JaroWinklerSimilarityScorer.name}'.`, JaroWinklerSimilarityScorer.name)
  .option('-g, --group <group>', 'The name of a group. If used, files with that group are grabbed, and the members in these files\' names are used. This is only used for initializing an authoritative list of names.', null)
  .option('-w, --week <week>', 'The number of a week. If used, files with that week are grabbed, and the members in these files\' names are used. This is only used for initializing an authoritative list of names.', null)
  .option('-u, --use-names <useNames>', 'Optional. Comma-separated list of authoritative names. If present, these names will be used, instead of trying to grab them from files\' names.', '')
  .option('-l, --log-level <logLevel>', 'Optional. The log-level. Defaults to Debug. Needs to be numeric (0-6), where 0 is the most verbose.', LogLevel.Debug)
  .requiredOption('-d, --dir <dir>', 'Required. Path to a directory with reports.')
  .requiredOption('-o, --out-file <outFile>', 'Required. The path to an output file. CSV will be written there.')
  .parse(process.argv);


const logger = new ColoredConsoleLogger('Program')
, sim = program.nameMatcher === JaroWinklerSimilarityScorer.name ?
    new JaroWinklerSimilarityScorer() : new LevenshteinSimilarityScorer()
, nm = new NameMapper(sim, program.similarity)
, agg = new AggregateReport(nm)
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

logger.logLevel = parseInt(program.logLevel, 10);
logger.logInfo(`Similarities are measured using ${program.nameMatcher}`);
logger.logInfo(`Writing to file: ${program.outFile}`);

if (program.useNames) {
    logger.logInfo(`Using names: ${program.useNames}`);
    nm.addNames(program.useNames.split(',').map(n => n.trim()));
} else {
    logger.logInfo(`Reading names from files: ${program.dir}, week: ${program.week === null ? 'null' : program.week}, group: ${program.group === null ? 'null' : program.group}`);
    nm.addNames(NameMapper.readNamesFromFilesInFolder(
        program.dir, program.week, program.group))
}

logger.logDebug(`The NameMapper uses a minimum similarity of ${program.similarity} and these ${nm.names.length} authoritative names: ${nm.names.join(', ')}`);



try {
    agg.addReportsFromFolder(program.dir);
    logger.logInfo(`Aggregating ${agg.reports.length} reports.`);
} catch (e) {
    logger.logError(`Error reading reports from files in directory: ${program.dir}.`, e);
    process.exit(-1);
}



const timeout = setTimeout(() => {}, 2**30);
(async() => {
    try {
        for (const report of agg.reports) {
            const records = report.records.map(rc => {
                return {
                    member: rc.name,
                    week: report.week,
                    group: report.group,
                    amount: rc.amount,
                    scrumsMissed: rc.scrumsMissed,
                    otherMissed: rc.otherMissed
                }
            });

            await csvW.writeRecords(records);

            logger.logDebug(`Wrote ${records.length} Records of Report by ${report.author} (week: ${report.week}, group: ${report.group})`);
        }
    } finally {
        clearTimeout(timeout);
    }
})();
