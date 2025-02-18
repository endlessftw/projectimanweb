const express = require('express');
const router = express.Router();
const Resource = require('../models/Resource');

// Get all resources
router.get('/', async (req, res) => {
    try {
        const resources = await Resource.find().sort({ 'score': -1 });
        res.json(resources);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create a new resource
router.post('/', async (req, res) => {
    const resource = new Resource({
        title: req.body.title,
        link: req.body.link,
        category: req.body.category,
        description: req.body.description
    });

    try {
        const newResource = await resource.save();
        res.status(201).json(newResource);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Update votes
router.patch('/:id/vote', async (req, res) => {
    try {
        const { isUpvote } = req.body;
        const resource = await Resource.findById(req.params.id);

        if (!resource) {
            return res.status(404).json({ message: 'Resource not found' });
        }

        if (isUpvote) {
            resource.votes.upvotes += 1;
        } else {
            resource.votes.downvotes += 1;
        }

        const updatedResource = await resource.save();
        res.json(updatedResource);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Get resources by category
router.get('/category/:category', async (req, res) => {
    try {
        const resources = await Resource.find({ category: req.params.category }).sort({ 'score': -1 });
        res.json(resources);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Search resources
router.get('/search', async (req, res) => {
    try {
        const searchTerm = req.query.q;
        const resources = await Resource.find({
            $or: [
                { title: { $regex: searchTerm, $options: 'i' } },
                { description: { $regex: searchTerm, $options: 'i' } }
            ]
        }).sort({ 'score': -1 });
        res.json(resources);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router; 