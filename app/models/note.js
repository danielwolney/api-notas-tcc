var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var NoteSchema = new Schema({
                                text: String,
                                date: Schema.Types.Date,
                                creator: {type: Schema.Types.ObjectId, ref: 'User'}
                            })

module.exports = mongoose.model('Note', NoteSchema);
