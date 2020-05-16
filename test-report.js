const program = require('commander')
, { existsSync, readFileSync } = require('fs')
, { resolve, dirname, basename } = require('path')
, packagePath = resolve(dirname(__filename), './package.json')
, package = JSON.parse(readFileSync(packagePath))
, { Report } = require('./lib/Report')
, { CollectingNameMapper, JaroWinklerSimilarityScorer } = require('./lib/NameMapper')
, { ColoredConsoleLogger, LogLevel } = require('sh.log-client')
, { formatError } = require('sh.orchestration-tools')
, jw = new JaroWinklerSimilarityScorer()
, logger = new ColoredConsoleLogger('Program');

logger.logLevel = LogLevel.Trace;

program
  .version(`\n  This is Virtual-Dollars (report-checker)@v${package.version} by ${package.author}\n`, '-v, --version')
  .option('-s, --similarity <similarity>', 'Optional. The maximum score [0..1] for matching names. If the score (similarity) between two names is higher, will throw an Error. Defaults to 0.7.', 0.7)
  .requiredOption('-f, --file <file>', 'Required. Path to a report-file to check.')
  .parse(process.argv);



try {
    const cnm = new CollectingNameMapper(jw, program.similarity)
    , p = resolve(program.file);

    if (!existsSync(p)) {
        throw new Error(`File does not exist: ${p}`);
    }
    
    const report = Report.fromFile(p, cnm);

    logger.logDebug(`Your Report is Valid!`);
    logger.logInfo(`The name of the reporter is: ${report.author}`);
    logger.logInfo(`The Report is a Scrum Master Report: ${report.records.filter(rc => rc.isScrumMaster).length > 0}`);
    logger.logInfo(`The week and group are: ${report.week}, ${report.group}`);
    logger.logInfo(`----------`);
    logger.logInfo('The following records are contained:');
    report.records.forEach(rc => {
        logger.logDebug(rc);
    });
} catch (e) {
    logger.logError(`Your report is not valid, the following errors occured:\n----------\n${formatError(e)}`);
    process.exit(-1);
}