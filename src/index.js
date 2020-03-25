import dotenv from 'dotenv'
import Twitter from 'twitter'
import _ from 'lodash/fp'
import moment from 'moment'
const { conforms, isString, get, random } = _
dotenv.config()

import responses from './responses'

const { ACCESS_TOKEN, ACCESS_TOKEN_SECRET, API_KEY, API_SECRET_KEY } = process.env
const client = new Twitter({
    consumer_key: API_KEY,
    consumer_secret: API_SECRET_KEY,
    access_token_key: ACCESS_TOKEN,
    access_token_secret: ACCESS_TOKEN_SECRET
})

const isTweet = conforms({
    id_str: isString,
    text: isString,
})

const getRandomResponse = () => responses[random(0, responses.length - 1)]

let tweetCount =  0
let lastTweetSentTime = ''
const SELF_SCREEN_NAME = 'no_malarkey_joe'
const MINS_PER_TWEET = 5

const stream = client.stream('statuses/filter', { track: 'malarkey,malarky' })
stream.on('data', async event => {
    if (isTweet(event)) {
        const tweetId = get('id_str', event)
        const user = get('user.screen_name', event)
        const allowTweet = moment(Date.now()).isAfter(
            moment(lastTweetSentTime).add(MINS_PER_TWEET, 'minutes')
        )

        if (user === SELF_SCREEN_NAME) return // dont reply to ourselves
        if (get('retweeted_status.id_str', event)) return // dont reply to retweets
        if (lastTweetSentTime && !allowTweet) return // only tweet every 5 mins max

        try {
            const reply = await client.post('statuses/update', {
                in_reply_to_status_id: tweetId,
                auto_populate_reply_metadata: true,
                status: `Hey kid, @${user}, ${getRandomResponse()}`
            })

            if (get('id', reply)) {
                const timeSinceLastTweet = moment(Date.now()).diff(moment(lastTweetSentTime), 'minutes')
                tweetCount++
                lastTweetSentTime = moment(Date.now())
                console.log('Sent a malarkey tweet, total tweets sent: ', tweetCount, ' Mins since last tweet: ', timeSinceLastTweet)
            }
        } catch (error) {
            console.log('error sending tweet', error)
        }
    }
})

stream.on('error', error => {
    console.log('GOT AN ERROR', error)
})

