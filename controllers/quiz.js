import { prisma } from "../lib/prisma.js";











async function getQuizCategories(req, res) {
    try {
        const categories = await prisma.category.findMany();
        return res.status(200).json({
            success: true,
            data: categories,
        });
    } catch (error) {
        console.error("Error getting quiz categories:", error);
        return res.status(500).json({
            success: false,
            error: "Failed to get quiz categories",
        });
    }
}

export {
    getQuizCategories
}