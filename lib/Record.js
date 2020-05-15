const { NameMapper } = require('./NameMapper');


class Record {

    /**
     * @returns {String}
     */
    get name() {
        return this._name;
    };

    /**
     * @returns {Boolean}
     */
    get isSelfReport() {
        return this._selfReport;
    };

    /**
     * @returns {Number}
     */
    get amount() {
        return this._amount;
    };

    /**
     * @returns {Number}
     */
    get scrumsMissed() {
        return this._scrumsMissed;
    };

    /**
     * @returns {Number}
     */
    get otherMissed() {
        return this._otherMissed;
    };

    /**
     * @returns {Boolean}
     */
    get isScrumMaster() {
        return this._isScrumMaster;
    };

    /**
     * We create a Record from a line in the text-file. A line looks like:
     * 
     * - "Bigs Darklighter, 5, 1, 0"
     * - "Nien Nunb, 10"
     * - "ME, -"
     * 
     * @param {String} line
     * @param {NameMapper} nameMapper
     */
    constructor(line, nameMapper, integerAmountOnly = false, trimTrailingCommas = true) {
        this._nameMapper = nameMapper;
        this._isScrumMaster = false;

        line = `${line}`;
        if (trimTrailingCommas) {
            line = line.replace(/(:?,\s*?)+$/, '');
        }

        const sp = `${line}`.split(/,\s*?/).map(x => x.trim());
        if (sp.length < 2) {
            throw new Error(`Invalid line (too few components): '${line}'`);
        }

        this._selfReport = /^me$/i.test(sp[0].trim()) || /-/i.test(sp[1]);
        this._name = this._selfReport ?
            'ME' : nameMapper.getMatchedName(sp[0].split(/\s+/).sort().join(' '));

        if (!this._selfReport) {
            // parse amount
            const amount = parseFloat(sp[1]);
            if (integerAmountOnly && !Number.isInteger(amount)) {
                throw new Error(`The amount '${amount}' is not an integer.`);
            }
            this._amount = amount;
        }

        if (sp.length > 2) {
            if (sp.length !== 4) {
                throw new Error(`Too few or many columns: ${line}`);
            }

            this._scrumsMissed = Math.round(parseFloat(sp[2]));
            this._otherMissed = Math.round(parseFloat(sp[3]));
        } else {
            this._scrumsMissed = 0;
            this._otherMissed = 0;
        }
    };
};


module.exports = Object.freeze({
    Record
});
