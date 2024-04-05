const { DictionaryMapBased } = require('sh.orchestration-tools')
, JR = require('jaro-winkler')
, LS = require('js-levenshtein')
, fs = require('fs')
, path = require('path')
, fileNameRegex = /.*?week(?<week>\d+)group(?<group>[a-z0-9]+?)by(?<author>.+?)(?:\.txt)?$/i;



class SimilarityScorer {
    constructor(computeSplitScore = true) {
        this.computeSplitScore = computeSplitScore;
    };

    /**
     * A higher score means greater similarity.
     * 
     * @param {String} compareFrom 
     * @param {String} compareTo 
     * @returns {Number}
     */
    score(compareFrom, compareTo) {
        const spFrom = compareFrom.split(/\s+/)
        , spTo = compareTo.split(/\s+/);

        if (this.computeSplitScore && spFrom.length > 1 && spFrom.length === spTo.length) {
            let factor = 1;
            for (let i = 0; i < spFrom.length; i++) {
                factor *= this._similarity(spFrom[i], spTo[i]);
            }

            return factor;
        }

        return this._similarity(compareFrom, compareTo);
    };

    _similarity(a, b) {
        throw new Error('abstract');
    };
};


class JaroWinklerSimilarityScorer extends SimilarityScorer {
    constructor(computeSplitScore = true) {
        super(computeSplitScore);
    };

    _similarity(a, b) {
        return JR(a, b);
    };
};


class LevenshteinSimilarityScorer extends SimilarityScorer {
    constructor(computeSplitScore = true) {
        super(computeSplitScore);
    };

    _similarity(a, b) {
        const maxDist = Math.max(a.length, b.length);
        return 1 - (LS(a, b) / maxDist);
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
     * @param {...String} names Authoritative names
     * @returns {this}
     */
    addName(...names) {
        names.forEach(name => {
            this._names.add(new Name(name, this.useLowerCase));
        });
        return this;
    };

    /**
     * @param {Set.<String>|Array.<String>} names 
     * @returns {this}
     */
    addNames(names) {
        return this.addName(...names);
    };

    /**
     * @returns {Array.<String>}
     */
    get authoritativeNames() {
        return [...this._names].map(n => n.name);
    };

    /**
     * @returns {DictionaryMapBased.<String, Name>}
     */
    get mappedNames() {
        return this._map;
    };

    /**
     * @param {String} name
     * @returns {String} Given a name, returns the closest authoritative
     * name known by this NameMapper. Any of the similar names must have
     * the specified minimum similarity of this NameMapper. If no name
     * is similar enough, an Error is thrown.
     */
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

        if (matches.length === 0 || (matches[0].score < this.minSimilarity)) {
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
            return m[3].match(/\p{L}\p{Ll}+/gu).join(' ');
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



/**
 * A NameMapper that collects its authoritative names as they
 * are added. If an added name is too similar to any of the
 * known names, an Error is thrown.
 */
class CollectingNameMapper extends NameMapper {
    /**
     * @param {SimilarityScorer} simScorer 
     * @param {Number} maxSimilarity 
     */
    constructor(simScorer, maxSimilarity = 0.5) {
        super(simScorer);
        this.maxSimilarity = maxSimilarity;
    };

    /**
     * When adding a new name, it must not be too similar to already
     * known names.
     * 
     * @param  {...String} names
     * @returns {this}
     */
    addName(...names) {
        for (const name of names) {
            const asName = new Name(name, this.useLowerCase);

            if (this._map.has(asName.name)) {
                throw new Error(`Name already known: '${asName.name}'`);
            }

            // Also check if any of the other names is too similar:
            const allNames = Array.from(this._names.values())
            , matches = allNames.map(name => {
                return { name, score: this.simScorer.score(asName.proc, name.proc) }
            }).sort((o1, o2) => o1.score > o2.score ? -1 : 1)
            .filter(o => o.score >= this.maxSimilarity);

            if (matches.length > 0) {
                throw new Error(`The name '${asName.name}' is too similar to the already known name(s) '${matches.map(m => `${m.name.name} (${m.score.toFixed(2)})`)}'. You can try lowering the maximum similarity threshold. Also, this may be an indicator for having duplicate lines in your Report.`);
            }

            super.addName(name);
        }

        return this;
    };

    /**
     * If this mapper does not know the name, it will be added as an
     * authoritative name.
     * 
     * @param {String} name 
     * @returns {String} the authoritative name
     */
    getMatchedName(name) {
        // Let's see if we know this name:
        try {
            return super.getMatchedName(name);
        } catch (e) {
            this.addName(name);
            const asName = new Name(name, this.useLowerCase);
            return asName.name;
        }
    };
};



module.exports = Object.freeze({
    Name,
    NameMapper,
    CollectingNameMapper,
    fileNameRegex,
    SimilarityScorer,
    JaroWinklerSimilarityScorer,
    LevenshteinSimilarityScorer
});