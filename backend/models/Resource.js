const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    link: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        required: true,
        enum: ['coding', 'design', 'business', 'marketing', 'productivity']
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    dateAdded: {
        type: Date,
        default: Date.now
    },
    votes: {
        upvotes: {
            type: Number,
            default: 0
        },
        downvotes: {
            type: Number,
            default: 0
        }
    }
});

// Add a virtual property for vote score
resourceSchema.virtual('score').get(function() {
    return this.votes.upvotes - this.votes.downvotes;
});

// Ensure virtuals are included in JSON output
resourceSchema.set('toJSON', {
    virtuals: true,
    transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
    }
});

module.exports = mongoose.model('Resource', resourceSchema); 