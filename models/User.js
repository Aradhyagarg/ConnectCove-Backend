const mongoose = require ("mongoose") ;
const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require('crypto');
const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Please enter the name"],
    },
    avatar: {
        public_id: String,
        url: String,
    },
    email: {
        type: String,
        required: [true, "Please enter an email"],
        unique: true,
    },
    password: {
        type: String,
        required: [true, "Please enter a password"],
        minlength: [6, "Password must be at least 6 characters"],
        select: false,
    },
    posts: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Post",
        }
    ],
    followers: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        }
    ],
    following: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        }
    ],
    resetPasswordToken: String,
    resetPasswordExpire: Date,
});

userSchema.pre("save", async function (next) {
    if(this.isModified("password")){
        this.password = await bcryptjs.hash(this.password, 10);
    }
    next();
})

userSchema.methods.matchPassword = async function (password) {
    return await bcryptjs.compare(password, this.password);
}

userSchema.methods.generateToken = async function (){
    return jwt.sign({_id: this._id}, process.env.SECRET_KEY);
}

/*userSchema.methods.getResetPasswordToken = async function (){
    const resetToken = crypto.randomBytes(20).toString("hex");
    console.log(resetToken);
    this.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
    return resetToken
}*/
userSchema.methods.getResetPasswordToken = function () {
    const resetToken = crypto.randomBytes(20).toString("hex");
  
    this.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
  
    return resetToken;
  };

module.exports = mongoose.model("User", userSchema);