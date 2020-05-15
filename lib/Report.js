const { readFileSync } = require('fs')
, { basename } = require('path')
, { Record } = require('./Record')
, { NameMapper, fileNameRegex } = require('./NameMapper')
, { formatError } = require('sh.orchestration-tools');

class Report {

    /**
     * @returns {Array.<Record>}
     */
    get records() {
        return this._records;
    };

    /**
     * @returns {Number}
     */
    get week() {
        return this._week;
    };

    /**
     * @returns {String}
     */
    get group() {
        return this._group;
    };

    /**
     * @returns {String} The author name of this report, separated
     * by spaces.
     */
    get author() {
        return this._author;
    };

    /**
     * 
     * @param {String} name The report-file's name. Needs to contain
     * the week number, group name and author.
     * @param {NameMapper} nameMapper A NameMapper used to resolve names.
     */
    constructor(name, nameMapper) {
        this._nameMapper = nameMapper;
        /** @type {Array.<Record>} */
        this._records = [];

        if (!fileNameRegex.test(name)) {
            throw new Error(`Bad file name: ${name}`);
        }

        const m = name.replace(/\.txt/i, '').trim().match(fileNameRegex);
        this._week = parseFloat(m[1]) | 0;
        this._group = m[2];
        this._author = nameMapper.getMatchedName(
            m[3].match(/\p{L}\p{Ll}+/gu).sort().join(' '));
    };

    /**
     * @param {String} line
     * @returns {this}
     */
    addRecordFromLine(line, ignoreSelfRecords = true) {
        try {
            const record = new Record(line, this._nameMapper);
            if (!record.isSelfReport || !ignoreSelfRecords) {
                this.records.push(record);
            }
        } catch (e) {
            throw new Error(`Cannot create Record from this line: '${line}'. This Report - Author: ${this.author}, Group: ${this.group}, Week: ${this.week}. ${formatError(e)}`);
        }
        return this;
    };

    /**
     * @param {String} contents 
     * @returns {Boolean}
     */
    static testFileName(name) {
        return fileNameRegex.test(name);
    };


    /**
     * @param {String} fileName
     * @param {String} contents 
     * @param {NameMapper} nameMapper
     * @returns {Report}
     */
    static fromString(fileName, contents, nameMapper) {
        const report = new Report(fileName, nameMapper);
        
        `${contents}`.split(/\r\n|\n|\r/)
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .filter(line => !/^me\s*?,/i.test(line))
            .forEach(line => report.addRecordFromLine(line));
        
        return report;
    };

    /**
     * @param {String} contents
     * @param {NameMapper} nameMapper
     * @returns {Report}
     */
    static fromFile(absFilePath, nameMapper) {
        const content = readFileSync(absFilePath).toString('utf-8');
        return Report.fromString(basename(absFilePath), content, nameMapper);
    };
    
    get [Symbol.toStringTag] () {
        return this.constructor.name;
    };
};


module.exports = Object.freeze({
    Report
});