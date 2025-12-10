const FieldModel = require("../models/Mongo/Field.js");
const BookingModel = require("../models/Postgres/Booking.js");
const { formatDateYYYYMMDD } = require("../utils/timeFormat.js");

const getAnalyticsPage = async (req, res) => {
   try {
      const startDate = new Date();
      const endDate = new Date();
      startDate.setDate(endDate.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 99);

      const queryStartDate = req.query.startDate ? new Date(req.query.startDate) : startDate;
      const queryEndDate = req.query.endDate ? new Date(req.query.endDate) : endDate;

      queryStartDate.setHours(0, 0, 0, 0);
      queryEndDate.setHours(23, 59, 59, 99);

      const matchCondtions = {
         status: "success",
         paymentTime: { $gte: queryStartDate, $lte: queryEndDate },
      };

      const fieldFilter = req.query.fieldFilter || "all";
      if (fieldFilter !== "all") {
         const field = await FieldModel.findOne({ fieldID: fieldFilter, isActive: true });
         if (field) matchCondtions.field = field._id;
      }

      console.log(matchCondtions);

      // utk pilihan dropdown filter
      const fieldFilterDropdown = await FieldModel.find({ isActive: true });

      // single aggregation dgn $facet
      const analyticsPipeline = await BookingModel.aggregate([
         { $match: matchCondtions },

         {
            $facet: {
               revenue: [
                  {
                     $group: {
                        _id: null,
                        totalRevenue: { $sum: "$totalPrice" },
                        totalBookings: { $sum: 1 },
                     },
                  },
               ],

               revenueByCourt: [
                  {
                     $lookup: {
                        from: "fields", // sesuaikan dgn collection di MongoDB-nya
                        localField: "field",
                        foreignField: "_id",
                        as: "fieldInfo",
                     },
                  },
                  { $unwind: "$fieldInfo" }, // mengubah hasil lookup Array of booking obj -> booking objects (hilangin array yg nge-wrap)
                  {
                     $group: {
                        _id: "$fieldInfo.name",
                        revenue: { $sum: "$totalPrice" },
                        bookings: { $sum: 1 },
                        fieldID: { $first: "$fieldInfo.fieldID" }, // setiap booking pd field yg sama, lgsg aja ambil fieldID dari booking first entry
                     },
                  },
                  { $sort: { revenue: -1 } },
               ],

               revenueByDate: [
                  {
                     $group: {
                        _id: {
                           $dateToString: {
                              format: "%Y-%m-%d",
                              date: "$paymentTime",
                           },
                        },
                        revenue: { $sum: "$totalPrice" },
                        bookings: { $sum: 1 },
                     },
                  },
                  { $sort: { revenue: -1 } },
               ],
            },
         },
      ]);

      const fieldCount = await FieldModel.countDocuments({ isActive: true });

      const analytics = analyticsPipeline[0];

      console.log(fieldFilter);

      return res.render("admin/analytics", {
         analytics,
         fieldCount,
         filters: {
            startDate: queryStartDate,
            endDate: queryEndDate,
            fields: fieldFilter,
         },
         fieldFilterDropdown,
         formatDate: formatDateYYYYMMDD,
         formatPrice: (price) => price.toLocaleString("id-ID"),
      });
   } catch (error) {
      console.error(error);
      return res.status(404).send("Not Found!");
   }
};

module.exports = {
   getAnalyticsPage,
};
