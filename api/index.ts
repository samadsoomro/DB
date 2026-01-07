try {
    const { app } = require("../server/index.js");
    module.exports = app;
} catch (error: any) {
    module.exports = (req: any, res: any) => {
        res.status(500).json({ error: "Server Initialization Failed: " + error.message, stack: error.stack });
    }
}
