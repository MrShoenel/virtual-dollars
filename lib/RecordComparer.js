const { EqualityComparer } = require('sh.orchestration-tools');


/**
 * @type
 */
class RecordComparer extends EqualityComparer {
    /**
     * 
     * @param {Record} x 
     * @param {Record} y 
     */
    equals(x, y) {
        return false;
    };
};
