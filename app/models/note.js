var mongoose = require("mongoose");
var Schema = mongoose.Schema;
module.exports = mongoose.model('Note', new Schema({
                                                    text: String,
                                                    date: Schema.Types.Date,
                                                    creator: {type: Schema.Types.ObjectId, ref: 'User'}
                                                }));