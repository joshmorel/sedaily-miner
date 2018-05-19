require('dotenv').config()
const monk = require('monk');
const db = require('monk')(process.env.MONGO_DB);
const threads = db.get('forumthreads')
const posts = db.get('posts')
const users = db.get('users')
const moment = require('moment');

function createAuthorOrGetId(successCallback) {
  const THREAD_AUTHOR = {
    username: 'SoftwareDaily',
    name: 'Software Daily',
    bio: 'SED',
    email: 'contact@softwaredaily.com',
    website: 'https://www.softwaredaily.com'
  };
  const { username } = THREAD_AUTHOR;
  users.findOne({ username }).then((user) => {
    if (user) {
      console.log(`Found user ${username}. Using id ${user._id}`);
      return successCallback(user._id)
    }
    users.insert(THREAD_AUTHOR).then((newUser) => {
      console.log(`Couldn't find ${username}, created with id ${newUser._id}`);
      successCallback(newUser._id)
    })
  })
}

function createThreadForPodcastEpisode(post, authorId, successCallback) {
  // Make sure thread doesn't exist already:
  threads.findOne({podcastEpisode: post._id}).then((thread) => {
    if (!thread) {
      console.log('No forum thread for this podcast exists. Good to continue.');

      const date = moment(post.date).toDate()
      threads.insert({
        title: 'Discuss: ' + post.title.rendered,
        content: ' ',
        author: authorId,
        podcastEpisode: monk.id(post._id),
        score: 0 ,
        // __v: 0,
        deleted: false,
        commentsCount: 0,
        dateCreated: date,
        dateLastAcitiy: date,
      }).then( (thread) => {
        successCallback(thread);
      }).catch((e) => {
        console.log('error', e);
      })
    } else {
      console.log('!!!!!! Thread for post exists already:', thread);
      // TODO: associate forum thread to post:
    }
  }).catch((e) => {
    console.log('error', e);
  })


}

/*
// XXX: This removes forum thread key from episode model:
posts.find( {thread: {$exists: true}})
.each ((post) => {
  posts.update({_id: post._id}, {$unset: {
    thread: 1
  }}).then((result) => {
    console.log('removed')
  }).catch((e) => { console.log('error restting thread', e)})
});
*/

createAuthorOrGetId((authorId) => {
  posts.find( {thread: {$exists: false}})
  .each ((_post) => {
    (function(post){
      createThreadForPodcastEpisode(post, authorId, (thread) => {
        posts.update({_id: post._id}, {$set: {
            thread: monk.id(thread._id),
          }}).then((updatedPost) => {
        }).catch((e) => {
          console.log('error setting thread', post, thread);
        })
      });
    })(_post)
  });
})
