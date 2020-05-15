const { DictionaryMapBased } = require('sh.orchestration-tools')
, JR = require('jaro-winkler')
, LS = require('js-levenshtein')
, fs = require('fs')
, path = require('path')
, fileNameRegex = /.*?week(\d+)group(?:([a-z]+)?by)(.+)/i;



class SimilarityScorer {
    /**
     * A higher score means greater similarity.
     * 
     * @param {String} compareFrom 
     * @param {String} compareTo 
     * @returns {Number}
     */
    score(compareFrom, compareTo) {
        throw new Error('abstract');
    };
};


class JaroWinklerSimilarityScorer extends SimilarityScorer {
    constructor() {
        super();
    };

    score(compareFrom, compareTo) {
        return JR(compareFrom, compareTo);
    };
};


class LevenshteinSimilarityScorer extends SimilarityScorer {
    constructor() {
        super();
    };

    score(compareFrom, compareTo) {
        const maxDist = Math.max(compareFrom.length, compareTo.length);
        return 1 - (LS(compareFrom, compareTo) / maxDist);
    };
};




class Name {
    /**
     * 
     * @param {String} name 
     */
    constructor(name, useLowerCase = true) {
        name = `${name}`.trim();
        this.useLowerCase = useLowerCase;
        this.name = name;
        this.proc = name
            .normalize('NFKD').replace(/[\u0300-\u036F]/g, '');
        if (useLowerCase) {
            this.proc = this.proc.toLowerCase();
        }
        this.proc = this.proc.split(/\s+/).sort().join(' ');
    };
};


class NameMapper {
    /**
     * @returns {Array.<String>}
     */
    get names() {
        return [...this._names].map(n => n.name);
    };


    /**
     * @param {Scorer} simScorer
     * @param {Number} minSimilarity
     */
    constructor(simScorer, minSimilarity = 0.7, useLowerCase = true) {
        if (!(simScorer instanceof SimilarityScorer)) {
            throw new Error(`simScorer must be an instance of ${SimilarityScorer.name}`);
        }
        this.simScorer = simScorer;
        this.minSimilarity = minSimilarity;
        this.useLowerCase = useLowerCase;

        /** @type {Set.<Name>} */
        this._names = new Set();
        /** @type {DictionaryMapBased.<String, Name>} */
        this._map = new DictionaryMapBased();
    };

    /**
     * @param {Array.<String>} names Authoritative names
     * @returns {this}
     */
    addName(...names) {
        names.forEach(name => {
            this._names.add(new Name(name, this.useLowerCase));
        });
        return this;
    };

    /**
     * 
     * @param {Set.<String>|Array.<String>} names 
     */
    addNames(names) {
        return this.addName(...names);
    };

    getMatchedName(name) {
        const asName = new Name(name, this.useLowerCase);

        if (this._map.has(asName.name)) {
            return this._map.get(asName.name).name; // Return the original
        }

        // Otherwise, let's try to find a match:
        const allNames = Array.from(this._names.values())
        , matches = allNames.map(name => {
            return { name, score: this.simScorer.score(asName.proc, name.proc) }
        }).sort((o1, o2) => o1.score > o2.score ? -1 : 1);

        if (matches[0].score < this.minSimilarity) {
            throw new Error(`None of the known names is similar to '${name}'. The known names are: ${this.names.join(', ')}. Try lowering the minimum similarity (currently: ${this.minSimilarity}).`);
        }

        this._map.set(asName.name, matches[0].name);
        return matches[0].name.name;
    };

    /**
     * @param {Array.<String>} files Absolute paths to files that are
     * reports. Takes the files names to initialize the names.
     * @returns {Set.<String>} A set of names as read and parsed from
     * files that are reports. Splits the authors' names by uppercase
     * letters and joins then with a space. These names may then be
     * used to initialize a NameMapper instance.
     */
    static readNamesFromFiles(files, week = null, group = null) {
        return new Set(files.filter(file => {
            if (!fileNameRegex.test(file)) {
                return false;
            }
            const m = path.basename(file).replace(/\.txt/i, '').match(fileNameRegex);
            if (week !== null && `${week}` !== m[1]) {
                return false; // week is specified and does not match
            }
            if (group !== null && `${group}`.toLowerCase() !== m[2].toLowerCase()) {
                return false; // group not matching
            }
            return true;
        }).map(file => {
            const m = path.basename(file).replace(/\.txt/i, '').match(fileNameRegex);
            return m[3].match(/\p{L}\p{Ll}+/gu).sort().join(' ');
        }));
    };

    /**
     * @param {String} folder Path to a folder that contains reports.
     * These reports' names must match the regex.
     * @returns {Set.<String>} absolute paths to matching files
     */
    static readNamesFromFilesInFolder(folder, week = null, group = null) {
        return NameMapper.readNamesFromFiles(
            fs.readdirSync(path.resolve(folder)).filter(file => {
                return fileNameRegex.test(path.basename(file));
            }).map(file => path.resolve(path.join(folder, file))), week, group);
    };
    
    get [Symbol.toStringTag] () {
        return this.constructor.name;
    };
};



module.exports = Object.freeze({
    NameMapper,
    fileNameRegex,
    SimilarityScorer,
    JaroWinklerSimilarityScorer,
    LevenshteinSimilarityScorer
});