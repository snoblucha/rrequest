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
inspect = Npm.require('util').inspect;
fs = Npm.require('fs');
Fiber = Npm.require('fibers');

function show(obj) {
  return inspect(obj, false, Infinity);
}

function openInbox(cb) {
  bound_create_event_log({level:'INFO', tags:['imap'], message:'Starting email collection.'});
  imap.connect(function(err) {
    if (!err) {
      try {
        // Mark created replies as read
        var msgIds = created_replies.slice(0);
        imap.openBox('INBOX', false, function(err, mailbox) {
          msgIds.forEach(function(msgId) {
            imap.search([['HEADER', 'message-id', msgId]], function(err, results) {
              if (!err) {
                imap.addFlags(results[0], '\\Seen', function(e) {
                  if (e) {
                    bound_create_event_log({level:'ERROR', tags:['imap'], message:'Failed to mark ' + msgId + ' as seen.'});
                  } else {
                    bound_create_event_log({level:'INFO', tags:['imap'], message:'Marked ' + msgId + ' as seen.'});
                    var idx = created_replies.indexOf(msgId);
                    if (idx > -1) {
                      created_replies.splice(idx, 1);
                    }
                  }
                });
              }
            });
          });
        });
        // Collect new mail
        imap.openBox('INBOX', false, cb);
      } catch (error) {
        bound_create_event_log({level:'ERROR', tags:['imap'], message:error.message});
      }
    }
  });
}

imap = null;
var getmail = false;

Meteor.startup(function (){
  var settings = EmailGatewaySettings.findOne();
  if (settings === undefined) {

  } else {
    if (settings.imap_username && settings.imap_password && settings.imap_host && settings.imap_port){
      getmail = true;
      imap = new Imap({
        user: settings.imap_username,
        password: settings.imap_password,
        host: settings.imap_host,
        port: settings.imap_port,
        secure: settings.imap_secure
      });
      imap.on('error', function(err) {
        console.log('imap error: ' + err);
      });
    }
  }

  var interval = parseInt(settings.imap_interval) || 60;
  Meteor.setInterval(fetchmail, interval * 1000);
});


var collectmail = function (err, mailbox) {
  if (!err) {
    try {
      imap.search([ 'UNSEEN' ], function(err, results) {
        if (!err) {
          try {
           imap.fetch(results, {markSeen: false},
              { body: true, headers: {parse: false},
                cb: function(fetch) {
                  fetch.on('message', function(msg) {
                    fds = {};
                    filenames = {};
                    parser = new mailparser.MailParser({streamAttachments:false});

                    parser.on('headers', function(headers) {
                      //console.log("Headers: " + show(headers));
                    });

                    parser.on('attachment', function(attachment) {
                    });

                    parser.on("end", function(mail_object){
                      Fiber(function() {
                        process_mail(mail_object);
                      }).run();
                    });

                    msg.on('data', function(data) {
                      try {
                        parser.write(data.toString());
                      } catch (error) {
                        bound_create_event_log({level:'ERROR', tags:['imap'], message:error.message});
                      }
                    });

                    msg.on('end', function() {
                      try {
                        parser.end();
                      } catch (error) {
                        bound_create_event_log({level:'ERROR', tags:['imap'], message:error.message});
                      }
                    });
                  });
                  fetch.once('error', function(err) {
                    console.log('imap error: ' + err);
                  });
                }
              }, function(err) {
                bound_create_event_log({level:'INFO', tags:['imap'], message:'Finished fetching all messages.'});
                imap.logout();
              }
            );
          } catch(error) {
          }
        }
      });
    } catch(error) {
      bound_create_event_log({level:'ERROR', tags:['imap'], message:error.message});
    }
  }
};

var fetchmail = function () {
  if(getmail === true) {
    try {
      openInbox(collectmail);
      //imap.logout();
    } catch (error) {
      bound_create_event_log({level:'ERROR', tags:['imap'], message:error.message});
    }
  }
};
