var express=require("express");
var app=express();
var bodyParser=require("body-parser");
var mongoose=require("mongoose");
var flash=require("connect-flash");
var passport=require("passport");
var LocalStrategy=require("passport-local");
var methodOverride=require("method-override");
var Campground=require("./models/campground");
var Comment=require("./models/comment");
var User=require("./models/user");
//var seedDB=require("./seeds");





mongoose.connect("mongodb://kannan:mango@cluster0-shard-00-00.yunra.mongodb.net:27017,cluster0-shard-00-01.yunra.mongodb.net:27017,cluster0-shard-00-02.yunra.mongodb.net:27017/yelp_camp?ssl=true&replicaSet=atlas-bwjam2-shard-0&authSource=admin&retryWrites=true&w=majority");
app.use(bodyParser.urlencoded({extended:true}));

app.set("view engine","ejs");
app.use(express.static(__dirname+"/public"));
app.use(methodOverride("_method"));
app.use(flash());
//SseedDB();
// var campgroundSchema=new mongoose.Schema({
//   name:String,
//     image:String,
//     description:String
// });

//  var Campground=mongoose.model("Campground",campgroundSchema);
// Campground.create(//{name:"Salmon Creek",image:"https://www.photosforclass.com/download/px_699558"}
//   // {name:"Granite Hill",image:"https://www.photosforclass.com/download/px_1061640"}
//      {name:"Mountain Goat's Rest",image:"https://www.photosforclass.com/download/px_1230302",
//          description:"This is a huge granite hill. No water. Beautiful granite."
//      }
// ,function(err,campground){
//     if(err){
//         console.log("error occured");
//     }
//     else{
//         console.log("successfully added");
//         console.log(campground);
//     }
//});

// Campground.find({}).remove( function(err,camp){
//     if(err){
//         console.log("error");
//     }
//     else{
//      console.log("removed");   
//     }
//});

app.use(require("express-session")({
    secret: "Once again Rusty wins cutest dog!",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(function(req, res, next){
   res.locals.currentUser = req.user;
   res.locals.error=req.flash("error");
   res.locals.success=req.flash("success");
   next();
});

app.get("/",function(req,res){
   res.redirect("/campgrounds"); 
});

app.get("/campgrounds",function(req,res){
    Campground.find({},function(err,allCampgrounds){
      if(err){
          console.log("error fetching from db");
      } 
      else{
          res.render("index",{campgrounds:allCampgrounds,currentUser:req.user});
      //  console.log(campgrounds);
          //  
      }
    });
    //res.render("campgrounds",{campgrounds:campgrounds}); 
  
});

app.get("/campgrounds/new",isLoggedIn,function(req,res){
    res.render("new.ejs");
});

app.get("/campgrounds/:id",function(req,res){
   //res.render("show"); 
   var c=req.params.id;
  // console.log(c);
   Campground.findById(req.params.id).populate("comments").exec(function(err,foundCampground){
       if(err){
           console.log("error");
       }
       else{
           console.log(foundCampground);
           res.render("show",{campground:foundCampground});
           //res.send("show temp");
           //console.log(foundCampground);
       }
   });
});

app.post("/campgrounds",function(req,res){
    var name=req.body.name;
    var image=req.body.image;
    var description=req.body.description;
     var author = {
        id: req.user._id,
        username: req.user.username
    }
    var  newCampground={name:name,image:image,description:description,author:author};
    Campground.create(newCampground,function(err,newlyCreated){
       if(err){
           console.log(err);
       } 
       else{
           res.redirect("/campgrounds");
       }
    });
});

app.get("/campgrounds/:id/comments/new",isLoggedIn,function(req,res){
    var campground=req.params.id;
    Campground.findById(campground,function(err,foundCamp){
       if(err){
           console.log("error");
       } 
       else{
           res.render("newcomment",{campground:foundCamp});
       }
    });
    
    
});

app.post("/campgrounds/:id/comments",isLoggedIn,function(req,res){
    var campground=req.params.id;
    Campground.findById(campground,function(err,foundCamp){
       if(err){
           console.log(err);
              req.flash("error", "Something went wrong");
           res.redirect("/campgrounds");
       } 
       else{
           Comment.create(req.body.comment,function(err,comment){
              if(err){
                  console.log(err);
              } 
              else{
                  comment.author.id = req.user._id;
               comment.author.username = req.user.username;
               //save comment
               comment.save();
               foundCamp.comments.push(comment);
               foundCamp.save();
               console.log(comment);
                  req.flash("success", "Successfully added comment");
               res.redirect('/campgrounds/' + foundCamp._id);
              }
           });
          
           
       }
    });
});


app.get("/campgrounds/:id/edit",checkOwner,function(req,res){
        Campground.findById(req.params.id, function(err, foundCampground){
            if(err){
                   req.flash("error", "Campgroundnot found");
                res.redirect("/campgrounds");
            }
            else{
                res.render("editform", {campground: foundCampground});
            }
        
    });
});


app.put("/campgrounds/:id",checkOwner,function(req,res){
   var t=req.params.id;
   Campground.findByIdAndUpdate(t,req.body.camp,function(err,campground){
      if(err){
          console.log(err);
      } 
      else{
          res.redirect("/campgrounds/"+ campground._id);
      }
   }); 
});


app.post("/campgrounds/:id/remove",checkOwner,function(req,res){
    var t=req.params.id;
    Campground.remove({_id:t},function(err){
       if(err){
           res.redirect("/campgrounds");
       } 
       else{
           res.redirect("/campgrounds");
       }
    });
    
});

app.get("/campgrounds/:id/comments/:comment_id/edit",checkComMaker,function(req,res){
    Comment.findById(req.params.comment_id,function(err,foundcomment){
       if(err){
           res.redirect("back");
       } 
       else{
            res.render("editcomments",{campground_id:req.params.id,comment:foundcomment});
       }
    });
});

app.put("/campgrounds/:id/comments/:comment_id",checkComMaker,function(req,res){
    Comment.findByIdAndUpdate(req.params.comment_id,req.body.comment,function(err,updatedComment){
         if(err){
          res.redirect("back");
      } else {
          res.redirect("/campgrounds/" + req.params.id );
      }
    });
});

app.post("/campgrounds/:id/comments/:comment_id/removecomment",checkComMaker,function(req,res){
    Comment.remove({_id:req.params.comment_id},function(err){
        if(err){
            res.redirect("back");
        }
        else{
               req.flash("success", "Comment deleted");
            res.redirect("/campgrounds/"+req.params.id);
        }
    })
});

app.get("/register",function(req,res){
   res.render("register"); 
});

app.post("/register",function(req,res){
    var newUser=new User({username:req.body.username});
    User.register(newUser,req.body.password,function(err,user){
       if(err){
           req.flash("error", err.message);
           return res.render("register");
       } 
       else{
           passport.authenticate("local")(req,res,function(){
               req.flash("success", "Welcome to YelpCamp " + user.username);
                res.redirect("/campgrounds");
           });
       }
    });
    
});


app.get("/login",function(req,res){
   res.render("login"); 
});

app.post("/login",passport.authenticate("local",
    {
        successRedirect:"/campgrounds",
        failureRedirect:"/login"
    }),function(req,res){});

app.get("/logout",function(req,res){
   req.logout();
     req.flash("success", "Logged you out!");
   res.redirect("/campgrounds");
});



function isLoggedIn(req,res,next){
  if(req.isAuthenticated()){
   return next();   
  }
  else{
      req.flash("error","You need to be logged in to do that");
      res.redirect("/login");
  }
};

function checkOwner(req, res, next) {
 if(req.isAuthenticated()){
        Campground.findById(req.params.id, function(err, foundCampground){
           if(err){
               req.flash("error","Campground not found");
               res.redirect("back");
           }  else {
               // does user own the campground?
            if(foundCampground.author.id.equals(req.user._id)) {
                next();
            } else {
                 req.flash("error", "You don't have permission to do that");
                res.redirect("back");
            }
           }
        });
    } else {
           req.flash("error", "You need to be logged in to do that");
        res.redirect("back");
    }
}

function checkComMaker(req,res,next){
    if(req.isAuthenticated()){
        Comment.findById(req.params.comment_id, function(err, foundComment){
           if(err){
               res.redirect("back");
           }  else {
             //  console.log("foundComment==  "+ foundComment);
             //  console.log("req.user.id== "+req.user._id);
             //  next();
               // does user own the campground?
            if(foundComment.author.id.equals(req.user._id)) {
                next();
            } else {
                 req.flash("error", "You don't have permission to do that");
                res.redirect("back");
            }
           }
        });
    } else {
         req.flash("error", "You need to be logged in to do that");
        res.redirect("back");
    }
}


app.listen(process.env.PORT,process.env.IP,function(){
    console.log("server started");
});