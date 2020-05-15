const { NameMapper, fileNameRegex} = require('./NameMapper')
, { Report } = require('./Report')
, { readdirSync } = require('fs')
, { resolve, join } = require('path');


/**
 * The purpose of this class is to read multiple reports and
 * group them together.
 */
class AggregateReport {
    /**
     * @returns {Array.<Report>}
     */
    get reports() {
        return this._reports;
    };

    /**
     * @param {NameMapper} nameMapper 
     */
    constructor(nameMapper) {
        this.nameMapper = nameMapper;

        /** @type {Array.<Report>} */
        this._reports = [];
    };

    /**
     * @param {String} folder 
     * @returns {this}
     */
    addReportsFromFolder(folder) {
        readdirSync(resolve(folder))
            .filter(file => fileNameRegex.test(file))
            .map(file => Report.fromFile(resolve(join(folder, file)), this.nameMapper))
            .forEach(report => this._reports.push(report));
        return this;
    };
};


module.exports = Object.freeze({
    AggregateReport
});