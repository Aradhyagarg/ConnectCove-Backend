const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcryptjs = require("bcryptjs");
const Post = require("../models/Post");
const { sendEmail } = require("../middlewares/sendEmail");
const crypto = require("crypto");

exports.register = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ msg: "User already exists" });
        }
        const newUser = await User.create({
            name,
            email,
            password,
            avatar: { public_id: "sample_id", url: "sampleurl" }
        })

        const token = await newUser.generateToken();
        //const token = jwt.sign({_id: user._id}, process.env.SECRET_KEY);

        const options = {
            expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
            httpOnly: true,
        };

        res.status(201).cookie("token", token, options).json({
            success: true,
            user: newUser,
            token,
            message: "User Register successfully",
        })

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
}

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email }).select("+password");

        if (!user) {
            return res.status(400).json({ msg: "User does not exist" });
        }

        const isMatch = await user.matchPassword(password);

        if (!isMatch) {
            return res.status(400).json({ msg: "Invalid credentials" });
        }

        const token = await user.generateToken();
        //const token = jwt.sign({_id: user._id}, process.env.SECRET_KEY);

        const options = {
            expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
            httpOnly: true,
        };

        res.status(200).cookie("token", token, options).json({
            success: true,
            user,
            token,
            message: "Login successfull",
        })

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
}

exports.logout = async (req, res) => {
    try {
        res.cookie("token", null, {
            expires: new Date(Date.now()),
            httpOnly: true,
        }).json({
            success: true,
            message: "Logged out"
        })
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        })
    }
}

exports.followUser = async (req, res) => {
    try {
        const userToFollow = await User.findById(req.params.id);
        const loggedInUser = await User.findById(req.user._id);

        if (!userToFollow) {
            return res.status(400).json({ msg: "User does not exist" });
        }

        if (loggedInUser.following.includes(userToFollow._id)) {
            const indexFollowing = loggedInUser.following.indexOf(userToFollow._id);
            const indexFollowers = userToFollow.followers.indexOf(loggedInUser._id);

            loggedInUser.following.splice(indexFollowing, 1);
            userToFollow.followers.splice(indexFollowers, 1);

            await loggedInUser.save();
            await userToFollow.save();
        } else {
            loggedInUser.following.push(userToFollow._id);
            userToFollow.followers.push(loggedInUser._id);

            await loggedInUser.save();
            await userToFollow.save();
        }

        res.status(201).json({
            success: true,
            message: "User followed successfully",
        })
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
}

exports.updatePassword = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select("+password");
        const { oldPassword, newPassword } = req.body;
        if (!oldPassword || !newPassword) {
            return res.status(400).json({ msg: "Please enter all fields" });
        }
        const isMatch = await user.matchPassword(oldPassword);
        if (!isMatch) {
            return res.status(400).json({ msg: "Old password is incorrect" });
        }
        user.password = newPassword;
        await user.save();

        res.status(200).json({ msg: "Password updated successfully" });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Incorrect Update Password"
        });
    }
}

exports.updateProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        const { name, email } = req.body;

        if (name) {
            user.name = name;
        }

        if (email) {
            user.email = email;
        }
        await user.save();
        res.status(200).json({ msg: "Profile updated successfully" });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Incorrect Update Profile"
        });
    }
}

exports.deleteProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        const posts = user.posts;
        const followers = user.followers;
        const following = user.following;
        const userId = user._id;

        await user.deleteOne();

        res.cookie("token", null, {
            expires: new Date(Date.now()),
            httpOnly: true
        })

        for (let i = 0; i < posts.length; i++) {
            const post = await Post.findById(posts[i]);
            post.deleteOne();
        }

        // Removing User from Followers FolLowing
        for (let i = 0; i < followers.length; i++) {
            const follower = await User.findById(followers[i]);
            const index = follower.following.indexOf(userId);
            follower.following.splice(index, 1);
            await follower.save();
        }

        //Removing User from followings follow
        for (let i = 0; i < following.length; i++) {
            const follows = await User.findById(following[i]);
            const index = follows.followers.indexOf(userId);
            follows.followers.splice(index, 1);
            await follows.save();
        }

        res.status(200).json({ msg: "Profile deleted successfully" });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Incorrect Delete Profile"
        });
    }
}

exports.myProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).populate("posts");

        res.status(201).json({
            success: true,
            user,
        })
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Incorrect Get Profile Info"
        });
    }
}

exports.getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).populate("posts");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.status(201).json({
            success: true,
            user,
        })
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Incorrect Get Profile Info"
        });
    }
}

exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find({});

        res.status(201).json({
            success: true,
            users,
        })
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Incorrect Get All Users"
        });
    }
}

/*exports.forgotPassword = async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            })
        }
        const resetToken = user.getResetPasswordToken();
        await user.save();

        const resetUrl = `${req.protocol}://${req.get(
      "host"
    )}/password/reset/${resetToken}`;

    const message = `Reset Your Password by clicking on the link below: \n\n ${resetUrl}`;

    try{
        await sendEmail({
            email: user.email,
            subject: "Reset Password",
            message,
        })
        res.status(200).json({
            success: true,
            message: `Email sent to ${user.email} successfully`
        })

    }catch(error){
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();
        return res.status(500).json({
            success: false,
            message: "Email could not be sent"
        })
    }

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Incorrect Forgot Password"
        });
    }
}*/
exports.forgotPassword = async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        const resetPasswordToken = user.getResetPasswordToken();

        await user.save();

        const resetUrl = `${req.protocol}://${req.get("host")}/api/v1/password/reset/${resetPasswordToken}`;

        const message = `Reset Your Password by clicking on the link below: \n\n ${resetUrl}`;

        try {
            await sendEmail({
                email: user.email,
                subject: "Reset Password",
                message,
            });

            res.status(200).json({
                success: true,
                message: `Email sent to ${user.email}`,
            });
        } catch (error) {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;
            await user.save();

            res.status(500).json({
                success: false,
                message: error.message,
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const resetPasswordToken = crypto.createHash("sha256").update(req.params.token).digest("hex");
        const user = await User.findOne({
            resetPasswordToken,
            resetPasswordExpire: { $gt: Date.now() },
        })

        if (!user) {
            return res.status(401).json({
              success: false,
              message: "Token is invalid or has expired",
            });
          }      
          
          user.password = req.body.password;
          user.resetPasswordToken = undefined;
          user.resetPasswordExpire = undefined;
          await user.save();
          res.status(200).json({
            success: true,
            message: "Password reset successfully",
          })

    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}

/*exports.login = async(req, res) => {
    try{

        const {email, password} = req.body;
        const user = await User.findOne({email});
        if(!user){
            return res.status(400).json({msg: "User does not exist"});
        }

        const isMatch = await user.matchPassword(password);

        if(!isMatch){
            return res.status(400).json({msg: "Invalid credentials"});
        }

        const token = await user.generateToken();

        res.status(201).cookie("token", token).
        json({
            success: true,
            user,
        })

    }catch(error){
        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
}*/