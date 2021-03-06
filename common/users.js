/*
 * rrequest
 * http://www.rrequest.com/
 * (C) Copyright Bashton Ltd, 2013
 *
 * This file is part of rrequest.
 *
 * rrequest is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * rrequest is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with rrequest.  If not, see <http://www.gnu.org/licenses/>.
 *
*/
get_or_create_user = function(email_address) {
  var email = email_address.toLowerCase();
  var user = Meteor.users.findOne({'profile.email': email});
  if (user !== undefined) {
    return user;
  } else {
    try {
      userId = createAutoUser(email);
      user = Meteor.users.findOne(userId);
    } catch (error) {
      user = Meteor.users.findOne({'profile.email': email});
    }
    return user;
  }
};

current_user_level = function() {
    var user = Meteor.users.findOne({_id: Meteor.userId()});
    var user_level = 'requester';
    if (user !== undefined) {
        if(user.profile.isStaff) {
            user_level = 'staff';
        }
    }
    return user_level;
};

is_admin_by_id=function(userId){
  var user = Meteor.users.findOne({_id: userId});
  return user && is_admin(user);
};

is_admin=function(user){
  if(!user || typeof user === 'undefined') {
    return false;
  }
  return !!user.isAdmin;
};

is_staff_by_id=function(userId){
  var user = Meteor.users.findOne({_id: userId});
  return user && is_staff(user);
};

is_staff=function(user){
  if(!user || typeof user == 'undefined') {
    return false;
  }
  return user.profile.isStaff;
};

in_multiple_groups=function(user) {
  if(!user || typeof user == 'undefined') {
    return false;
  }
  groups = Groups.find({members: {$in: [user._id]}});
  if (groups.count() > 1 ) {
    return true;
  } else {
    return false;
  }
};

get_user_group=function(user) {
  if(!user || typeof user == 'undefined') {
    return false;
  }
  group = Groups.findOne({members: {$in: [user._id]}});
  if (group !== undefined) {
    return group._id;
  } else {
    return null;
  }
};

useremail=function(requester) {
  if (requester === undefined) {
    return 'Unknown';
  }

  var userId = null;
  if (typeof(requester) == 'string') {
    // Old style requester
    userId = requester;
  } else {
    // New requester with ID and email
    return requester.email;
  }

  if (userId != null) {
    var user = Meteor.users.findOne(userId);
    if (user !== undefined) {
      return user.profile.email;
    }
  }
  return 'Unknown';
};
