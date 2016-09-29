module.exports = {
    'secret': process.env.SECRET || 'frasesecreta',
    'database':  process.env.MONGO_URI || process.env.MONGOLAB_URI || 'mongodb://localhost/keepnotes'
};