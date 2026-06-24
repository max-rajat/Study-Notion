const { Mongoose } = require("mongoose");
const Category = require("../models/Category");
function getRandomInt(max) {
    return Math.floor(Math.random() * max)
  }

exports.createCategory = async (req, res) => {
	try {
		const { name, description } = req.body;
		if (!name) {
			return res
				.status(400)
				.json({ success: false, message: "All fields are required" });
		}
		const CategorysDetails = await Category.create({
			name: name,
			description: description,
		});
		console.log(CategorysDetails);
		return res.status(200).json({
			success: true,
			message: "Categorys Created Successfully",
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: error.message,
		});
	}
};

exports.updateCategory = async (req, res) => {
	try {
		const { categoryId, name, description } = req.body;
		if (!categoryId) {
			return res
				.status(400)
				.json({ success: false, message: "Category id is required" });
		}
		const updated = await Category.findByIdAndUpdate(
			categoryId,
			{ ...(name && { name }), ...(description !== undefined && { description }) },
			{ new: true }
		);
		if (!updated) {
			return res
				.status(404)
				.json({ success: false, message: "Category not found" });
		}
		return res.status(200).json({
			success: true,
			message: "Category Updated Successfully",
			data: updated,
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: error.message,
		});
	}
};

exports.deleteCategory = async (req, res) => {
	try {
		const { categoryId } = req.body;
		if (!categoryId) {
			return res
				.status(400)
				.json({ success: false, message: "Category id is required" });
		}
		const deleted = await Category.findByIdAndDelete(categoryId);
		if (!deleted) {
			return res
				.status(404)
				.json({ success: false, message: "Category not found" });
		}
		return res.status(200).json({
			success: true,
			message: "Category Deleted Successfully",
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: error.message,
		});
	}
};

exports.showAllCategories = async (req, res) => {
	try {
        console.log("INSIDE SHOW ALL CATEGORIES");
		const allCategorys = await Category.find({});
		res.status(200).json({
			success: true,
			data: allCategorys,
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: error.message,
		});
	}
};

//categoryPageDetails 

exports.categoryPageDetails = async (req, res) => {
    try {
      const { categoryId } = req.body
      console.log("PRINTING CATEGORY ID: ", categoryId);
      // Get courses for the specified category
      const selectedCategory = await Category.findById(categoryId)
        .populate({
          path: "courses",
          match: { status: "Published" },
          populate: "ratingAndReviews",
        })
        .exec()
  
      //console.log("SELECTED COURSE", selectedCategory)
      // Handle the case when the category is not found
      if (!selectedCategory) {
        console.log("Category not found.")
        return res
          .status(404)
          .json({ success: false, message: "Category not found" })
      }
      // Get courses for other categories (guard against there being none)
      const categoriesExceptSelected = await Category.find({
        _id: { $ne: categoryId },
      })
      let differentCategory = null
      if (categoriesExceptSelected.length > 0) {
        const randomCategory =
          categoriesExceptSelected[
            getRandomInt(categoriesExceptSelected.length)
          ]
        differentCategory = await Category.findById(randomCategory._id)
          .populate({
            path: "courses",
            match: { status: "Published" },
          })
          .exec()
      }
        //console.log("Different COURSE", differentCategory)
      // Get top-selling courses across all categories
      const allCategories = await Category.find()
        .populate({
          path: "courses",
          match: { status: "Published" },
          populate: {
            path: "instructor",
        },
        })
        .exec()
      const allCourses = allCategories.flatMap((category) => category.courses)
      const mostSellingCourses = allCourses
        .sort((a, b) => b.sold - a.sold)
        .slice(0, 10)
       // console.log("mostSellingCourses COURSE", mostSellingCourses)
      res.status(200).json({
        success: true,
        data: {
          selectedCategory,
          differentCategory,
          mostSellingCourses,
        },
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      })
    }
  }