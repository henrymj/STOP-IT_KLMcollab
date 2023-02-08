/**
 * stop-it_main.js
 * Kyoung Whan Choe (https://github.com/kywch/)
 * Henry Jones (https://github.com/henrymj)
 * 
 * The below codes are adapted from https://github.com/fredvbrug/STOP-IT
 * 
 **/

/*
 * Generic task variables
 */
var flag_debug = false;

/* 
 * STOP-IT specific variables
 */

// Current block & trial index
var trial_ind = 1; // trial indexing variable starts at 1 for convenience
var block_ind = 0; // block indexing variables: block 0 is considered to be the practice block

// activity tracking
var focus = 'focus'; // tracks if the current tab/window is the active tab/window, initially the current tab should be focused
var fullscr_ON = 'no'; // tracks fullscreen activity, initially not activated

// ----- CUSTOMISE THE STIMULI AND RESPONSES -----
// define the site that hosts stimuli images
// usually https://<your-github-username>.github.io/<your-experiment-name>/
var repo_site = 'https://kywch.github.io/STOP-IT/jsPsych_version/';

// locate the stimuli that will be used in the experiment
var fix_stim = repo_site + 'images/fix.png';
var go_stim1 = repo_site + 'images/go_left.png';
var go_stim2 = repo_site + 'images/go_right.png';
var stop_stim1 = repo_site + 'images/stop_left.png';
var stop_stim2 = repo_site + 'images/stop_right.png';

// define the appropriate response (key) for each stimulus
// (this will also be used to set the allowed response keys)
var cresp_stim1 = 'leftarrow';
var cresp_stim2 = 'rightarrow';

// here you can change the names of the stimuli in the data file
var choice_stim1 = 'left';
var choice_stim2 = 'right';

// ----- CUSTOMISE SCREEN VARIABLES -----
// Please note that Safari does not support keyboard input when in full mode!!!
// Therefore, this browser will be excluded by default

var fullscreen = true; // Fullscreen mode or not?
var minWidth = 800; // minimum width of the experiment window
var minHeight = 600; // minimum height of the experiment window

// ----- CUSTOMISE THE BASIC DESIGN -----

// Define the proportion of stop signals.
// This will be used to determine the number of trials of the basic design (in the main experiment file):
// Ntrials basic design = number of stimuli / proportion of stop signals
// E.g., when nprop = 1/4 (or .25), then the basic design contains 8 trials (2 * 4).
// The following values are allowed: 1/6, 1/5, 1/4, 1/3. 1/4 = default (recommended) value
// SEE signalArray BELOW // var nprop = 1 / 4;

// How many times should we repeat the basic design per block?
// E.g. when NdesignReps = 8 and nprop = 1/4 (see above), the number of trials per block = 64 (8*8)
// Do this for the practice and experimental phases (note: practice can never be higher than exp)
var NdesignReps_practice = 2;
var NdesignReps_exp = 5;

// Number of experimental blocks (excluding the first practice block).
// Note that NexpBl = 0 will still run the practice block
var NexpBL = 4;
var prac_offset = 1; // accounting for the second practice

// ----- CUSTOMISE THE TIME INTERVALS -----
// Following Bissett et al., 2021 "Severe violations of independence in response inhibition tasks"
var ITI = 1000; // fixed blank intertrial interval
//var FIX = 500; // fixed fixation presentation
// The below function generates a random fixation duration among 400, 450, 500, 550, 600, 650, 700 
function getRandomFIX() {
    min = Math.ceil(0);
    max = Math.floor(6);
    return 400 + 50 * Math.floor(Math.random() * (max - min + 1) + min);
}
var MAXRT = 1850; // fixed maximum reaction time
var SSD = 300; // start value for the SSD tracking procedure; will be updated throughout the experiment
var SSDstep = 50; // step size of the SSD tracking procedure; this is also the lowest possible SSD
var MINSSD = 100; // the minimum SSD
var iFBT = 500; // immediate feedback interval (during the practice phase)
var bFBT = 15000; // break interval between blocks
var toFBT = 3000; // time-out feedback interval after negative RT trials

// Bonus-related variables
// HMJ - keeping these on to keep the "mastery" feedback available

// To change the bonus, modify crit_RT and crit_prop below
var bonus = 0;
var block_bonus = 0;
var bonus_feedback = 'simple';

function bonus_RT_comp(avg_RT) {
    var crit_RT = 900;
    if (avg_RT > crit_RT) {
        // no bonus
        return 0;
    } else {
        // the maximum is 75: one gets the maximum bonus when their RT is below 450 ms
        return Math.min(75, Math.round((crit_RT - avg_RT) / 6));
    }
}

function bonus_multiplier(prop) {
    var crit_prop = 0.25;
    if (prop < 0) {
        // something is wrong
        return 0;
    } else if (prop > crit_prop) {
        // outside the payzone
        return 0;
    } else {
        return (crit_prop - prop) / crit_prop;
    }
}

// the amount of potential bonus is shown at the first few practice blocks
// but the bonus is actually given after grant_bonus is set to true
var grant_bonus = false;


/* #########################################################################
Create the design based on the input from 'experiment_variables.js'
######################################################################### */
// Since we have two stimuli, the number of trials of the basic design = 2 * nstim
// This design will later be repeated a few times for each block
// (number of repetitions is also defined in 'experiment_variables.js')
//var ngostop = 1 / nprop // covert proportion to trial numbers. E.g. 1/5 = 1 stop signal and 4 go
//var ntrials = ngostop * 2 // total number of trials in basic design (2 two choice stimuli x ngostop)
//var signalArray = Array(ngostop - 1).fill('go'); // no-signal trials
//signalArray[ngostop - 1] = ('stop'); // stop-signal trials

// setup for 5 go, 2 stop trial design
var signalArray = ['go', 'go', 'go', 'go', 'go', 'stop', 'stop']
var ngostop = signalArray.length
var ntrials = ngostop * 2

// create factorial design from choices(2) and signal(nstim)
var factors = {
    stim: [choice_stim1, choice_stim2],
    signal: signalArray,
};
var design = jsPsych.randomization.factorial(factors, 1);

// modify the design to make it compatible with the custom stop signal plugin
//  - set a first/second stimulus property.
//    on no-signal trials, only one image will be used (i.e. the go image/stimulus)
//    on stop-signal trials, two images will be used (i.e. the go and stop images/stimuli)
//  - set a data property with additional attributes for identifying the type of trial
for (var ii = 0; ii < design.length; ii++) {
    design[ii].data = {}
    if ((design[ii].stim == choice_stim1) && (design[ii].signal == 'go')) {
        design[ii].fixation = fix_stim;
        design[ii].first_stimulus = go_stim1;
        design[ii].second_stimulus = go_stim1;
        design[ii].data.stim = choice_stim1;
        design[ii].data.correct_response = cresp_stim1;
        design[ii].data.signal = "no";
    } else if ((design[ii].stim == choice_stim2) && (design[ii].signal == 'go')) {
        design[ii].fixation = fix_stim;
        design[ii].first_stimulus = go_stim2;
        design[ii].second_stimulus = go_stim2;
        design[ii].data.stim = choice_stim2;
        design[ii].data.correct_response = cresp_stim2;
        design[ii].data.signal = "no";
    } else if ((design[ii].stim == choice_stim1) && (design[ii].signal == 'stop')) {
        design[ii].fixation = fix_stim;
        design[ii].first_stimulus = go_stim1;
        design[ii].second_stimulus = stop_stim1;
        design[ii].data.stim = choice_stim1;
        design[ii].data.correct_response = "undefined";
        design[ii].data.signal = "yes";
    } else if ((design[ii].stim == choice_stim2) && (design[ii].signal == 'stop')) {
        design[ii].fixation = fix_stim;
        design[ii].first_stimulus = go_stim2;
        design[ii].second_stimulus = stop_stim2;
        design[ii].data.stim = choice_stim2;
        design[ii].data.correct_response = "undefined";
        design[ii].data.signal = "yes";
    }
    delete design[ii].signal;
    delete design[ii].stim;
};
if (flag_debug) {
    console.log(design); // uncomment to print the design in the browser's console
}

// HMJ - commented out lines to make sure task would break during testing if it attempted to display the bonus description text
// i.e. if I failed to remove references below.
/*
 * Instruction block
 */
// var bonus_desc_page1 = '<div class = centerbox><p class = block-text>The <b>performance-based bonus</b> is determined by multiplying RT score, GO score, and STOP score.</p></div>';
// var bonus_desc_page2 = '<div class = centerbox><p class = block-text><b>RT score</b> is (800 ms - your response time) / 6.</p>' +
//     ' <p class = block-text>If your response time is larger (slower) than 800ms you get no bonus. So please respond as quickly as possible.</p>' +
//     ' <p class = block-text>However, the maximum RT score is 75, so responding faster than 350 ms gives you the same 75.</p></div>'
// var bonus_desc_page3 = '<div class = centerbox><p class = block-text><b>GO score</b> is <br>(0.25 - the proportion of misses and incorrects) / 0.25.</p>' +
//     ' <p class = block-text>If you do not have any misses or incorrects, GO score becomes 1.</p>' +
//     ' <p class = block-text>If you miss or respond incorrectly more than 25% of the trials, GO score becomes 0, and you get no bonus. So, please try your best to respond correclty.</p></div>';
// var bonus_desc_page4 = '<div class = centerbox><p class = block-text><b>STOP score</b> is <br>(0.25 - abs(the proportion of successful stops - 0.5)) / 0.25.</p>' +
//     ' <p class = block-text>If the proportion is 0.5, STOP score becomes 1.</p>' +
//     ' <p class = block-text>If the proportion is over 0.75 or below 0.25, STOP score becomes 0, and you get no bonus.</p>' +
//     ' <p class = block-text>Please try your best in the stop trials, and you will get the proportion close to 0.5.</p></div>';
// var bonus_desc_page5 = '<div class = centerbox><p class = block-text>Please remember that <br><b>your bonus = RT score * GO score * STOP score</b>.</p>' +
//     ' <p class = block-text>The maximum bonus you can earn in a block is 75 cents.</p></div>';

// var bonus_desc_simple =
//     '<div class = centerbox><p class = block-text>The <b>performance-based bonus</b> is determined by how fast and accurate you are on the task.' +
//     ' The task is set up so that you should be able to stop yourself from responding 50% of the time the stop signal occurs.</p>' +
//     ' <p class = block-text>The closer you are at successfully stopping 50% of the time on trials with stop signals while responding as accurately and quickly as possible on trials without stop signals, the higher your bonus will be.</p>' +
//     ' <p class = block-text>The maximum bonus you can earn in a block is <b>75 cents</b>.</p></div>';

function generate_instruction_block() {
    var block_instruction = [];
    var stop_signal_instructions = {
        type: "instructions",
        pages: [
            '<div class = centerbox><p class = block-text>Your main task is to respond to <b>white arrows (with a black border)</b> that appear on the screen.</p>' +
            ' <p class = block-text>Press the <font color=blue><b>LEFT ARROW KEY</b></font> with the right index finger when you see a <font color=blue><b>LEFT ARROW</b></font>' +
            ' and press the <font color=green><b>RIGHT ARROW KEY</b></font> with the right ring finger when you see a <font color=green><b>RIGHT ARROW</b></font>.</p>' +
            ' <p class = block-text><b>Thus, <font color=blue>left arrow = left key</font> and <font color=green>right arrow = right key</font>.</p></b></div>',
            '<div class = centerbox><p class = block-text>However, on some trials (stop-signal trials) <font color=red>the arrows will turn <b>RED</b></font> after a variable delay.' +
            ' You have to stop your response when this happens.</p>' +
            ' <p class = block-text>On approximately half of the stop-signal trials, the red stop signal will appear soon and you will notice that it will be easy to stop your response.</p>' +
            ' <p class = block-text>On the other half of the trials, the red stop signals will appear late and it will become very difficult or even impossible to stop your response.</p></div>',
            '<div class = centerbox><p class = block-text>Nevertheless, it is really important that you do not wait for the stop signal to occur and that you respond as quickly and as accurately as possible to the white arrows.</p>' +
            ' <p class = block-text>After all, if you start waiting for the red stop signals, then the program will delay their presentation. This will result in long reaction times.</p></div>',
            '<div class = centerbox><p class = block-text>We will start with a short practice block in which you will receive immediate feedback. You will no longer receive immediate feedback in the next phases.</p>' +
            ' <p class = block-text>However, at the end of each experimental block, there will be a ' + (bFBT/1000).toString() + ' second break. During this break,' +
            // HMJ - modified these lines from the commented out lines below
            ' we will show you some information about your mean performance in the previous block.</p></div>', + 
            '<div class = centerbox><p class = block-text>The experiment consists of 2 practice blocks and ' +
            NexpBL.toString() + ' main blocks.</p>' +
            '<div class = centerbox><p class = block-text>If you are ready, please click next to start the first practice with immediate, trial-by-trial feedback.</p></div>'
            // OLD
            // ' we will show you some information about your mean performance and the <font color=red><b>resulting performance-based bonus</b></font> in the previous block.</p></div>', // bonus_desc_page1, bonus_desc_page2, bonus_desc_page3, bonus_desc_page4, bonus_desc_page5,
            // bonus_desc_simple,
            // '<div class = centerbox><p class = block-text>The experiment consists of 2 practice blocks (without actual bonus) and ' +
            // NexpBL.toString() + ' main blocks.</p>' +
            // ' <p class = block-text><b>IMPORTANT: You earn the bonus only in the main blocks.</b></p></div>',
            // '<div class = centerbox><p class = block-text>If you are ready, please click next to start the first practice with immediate, trial-by-trial feedback.</p></div>'
        ],
        show_clickable_nav: true,
        on_finish: function () {
            // make sure not to grant bonus
            grant_bonus = false;
        }
    };
    block_instruction.push(stop_signal_instructions);
    return {
        timeline: block_instruction
    };
}

/* 
 * Shared task components
 */

// start of each block
var block_start_page = {
    type: 'html-keyboard-response',
    stimulus: function() {
        console.log('Block index: ', block_ind);
        return '<p class = center-text>Press space to begin.</p>';
    },
    choices: ['space']
};

// get ready for beginning of block
// the get ready message is declared in the configuration/text_variables.js file
var block_get_ready = {
    type: 'html-keyboard-response',
    stimulus: '<p class = center-text>Get ready...</p>',
    choices: jsPsych.NO_KEYS,
    trial_duration: 2000
};

// blank inter-trial interval
var blank_ITI = {
    type: 'jspsych-detect-held-down-keys',
    stimulus: "",
    trial_duration: ITI / 2,
    response_ends_trial: false
};

// now put the trial in a node that loops (if response is registered)
var held_down_node = {
    timeline: [blank_ITI],
    loop_function: function (data) {
        if (data.values()[0].key_press != null) {
            return true; // keep looping when a response is registered
        } else {
            return false; // break out of loop when no response is registered
        }
    }
};

// the main stop-signal trial
// use custom-stop-signal-plugin.js to show three consecutive stimuli within one trial
// (fixation -> first stimulus -> second stimulus, with variable inter-stimuli-intervals)
var stop_signal_trial = {
    type: 'custom-stop-signal-plugin',
    fixation: jsPsych.timelineVariable('fixation'),
    fixation_duration: function() {
        return getRandomFIX();
    },
    stimulus1: jsPsych.timelineVariable('first_stimulus'),
    stimulus2: jsPsych.timelineVariable('second_stimulus'),
    trial_duration: MAXRT, // this is the max duration of the actual stimulus (excluding fixation time)
    // inter stimulus interval between first and second stimulus = stop signal delay (SSD)
    ISI: function () {
        return SSD;
    },
    response_ends_trial: true,
    choices: [cresp_stim1, cresp_stim2],
    data: jsPsych.timelineVariable('data'),
    // was the response correct? adapt SSD accordingly    
    on_finish: function (data) {
        
        // console.log('Variable FIX duration: ', data.onset_of_first_stimulus);
        
        // check if the response was correct
        // keys are stored in keycodes not in character, so convert for convenience
        if (data.key_press == null) {
            // convert explicitly to string so that "undefined" (no response) does not lead to empty cells in the datafile
            data.response = "undefined";
        } else {
            data.response = jsPsych.pluginAPI.convertKeyCodeToKeyCharacter(data.key_press);
        }
        data.correct = (data.response == data.correct_response);

        // if no response was made, the reaction time should not be -250 but null
        if (data.rt == -250) {
            data.rt = null
        };

        // on go trials, reaction times on the fixation (below zero) are always wrong
        if (data.signal == 'no' && data.rt < 0) {
            data.correct = false;
        };

        // set and adapt stop signal delay (SSD)
        data.SSD = SSD;
        data.trial_i = trial_ind;
        data.block_i = block_ind;
        trial_ind = trial_ind + 1;
        if (data.signal == 'yes') {
            if (data.correct) {
                SSD = SSD + SSDstep;
                if (SSD >= MAXRT) {
                    SSD = MAXRT - SSDstep;
                }
                if (flag_debug) {
                    console.log('Correct stop, SSD increased: ', SSD);
                }
            } else {
                SSD = SSD - SSDstep;
                if (SSD <= MINSSD) {
                    SSD = MINSSD;
                    if (flag_debug) {
                        console.log('Failed stop, SSD reached at the minimum SSD: ', SSD);
                    }
                } else {
                    if (flag_debug) {
                        console.log('Failed stop, SSD decreased: ', SSD);
                    }
                }
            }
        }
    }
};

// trial-by-trial feedback -- only present during the practice
var trial_feedback = {
    type: 'html-keyboard-response',
    choices: jsPsych.NO_KEYS,
    trial_duration: function() {
        var last_trial_data = jsPsych.data.get().last(1).values()[0];
        if (last_trial_data['correct']) {
            return iFBT;
        } else {
            return toFBT;
        }
    },
    stimulus: function () {
        var last_trial_data = jsPsych.data.get().last(1).values()[0];
        if (last_trial_data['signal'] === 'no') {
            // go trials
            if (last_trial_data['correct']) {
                return '<p class = center-text>Correct!</p>';
            } else {
                if (last_trial_data['response'] === "undefined") {
                    // no response previous trial
                    return '<p class = center-text><font color=red>TOO SLOW</font></p>';
                } else {
                    if (last_trial_data['rt'] >= 0) {
                        return '<p class = center-text><font color=red>INCORRECT RESPONSE</font></p>';
                    } else {
                        return '<p class = center-text><font color=red>TOO FAST</font></p>';
                    }
                }
            }
        } else {
            // stop trials
            if (last_trial_data['correct']) {
                return '<p class = center-text>Correct!</p>';
            } else {
                if (last_trial_data['rt'] >= 0) {
                    return '<p class = center-text><font color=red>REMEMBER: try to STOP</font></p>';
                } else {
                    return '<p class = center-text><font color=red>TOO FAST</font></p>';
                }
            }
        }
    },
    on_finish: function () {
        if (trial_ind > NdesignReps_practice * ntrials) {
            jsPsych.endCurrentTimeline();
        }
    }
};


// trial-by-trial feedback during main blocks
// if the RT is negative, impose a 5-sec time out
var trial_feedback_to_negRT = {
    type: 'html-keyboard-response',
    choices: jsPsych.NO_KEYS,
    trial_duration: function() {
        var last_trial_data = jsPsych.data.get().last(1).values()[0];
        if ((last_trial_data['signal'] === 'no') & (last_trial_data['response'] === "undefined")) {
            return toFBT;
        } else if (!last_trial_data['correct'] & (last_trial_data['rt'] < 0)) {
            return toFBT;
        } else {
            return 0;
        }
    },
    stimulus: function() {
        var last_trial_data = jsPsych.data.get().last(1).values()[0];
        if ((last_trial_data['signal'] === 'no') & (last_trial_data['response'] === "undefined")) {
            return '<p class = center-text><font color=red>TOO SLOW</font></p>';
        } else if (!last_trial_data['correct'] & (last_trial_data['rt'] < 0)) {
            return '<p class = center-text><font color=red>TOO FAST</font></p>';
        } else {
            return '';
        }
    }
};


// at the end of the block, give feedback on performance
var block_feedback = {
    type: 'html-keyboard-response',
    trial_duration: function () {
        if (block_ind == (NexpBL + prac_offset) || grant_bonus == false) {
            return 10000000;
        } else {
            return bFBT;
        }
    },
    choices: function () {
        if (block_ind == (NexpBL + prac_offset) || grant_bonus == false) {
            return ['p', 'space']
        } else {
            return ['p'] // 'p' can be used to skip the feedback, useful for debugging
        }
    },
    stimulus: function () {
        // calculate performance measures
        var ns_trials = jsPsych.data.get().filter({
            trial_type: 'custom-stop-signal-plugin',
            block_i: block_ind,
            signal: 'no'
        });
        var avg_nsRT = Math.round(ns_trials.select('rt').subset(function (x) {
            return x > 0;
        }).mean());
        var prop_ns_Correct = Math.round(ns_trials.filter({
                correct: true
            }).count() / ns_trials.count() * 1000) /
            1000; // unhandy multiplying and dividing by 1000 necessary to round to two decimals
        var prop_ns_Missed = Math.round(ns_trials.filter({
            key_press: null
        }).count() / ns_trials.count() * 1000) / 1000;
        var prop_ns_Incorrect = Math.round((1 - (prop_ns_Correct + prop_ns_Missed)) * 1000) / 1000;
        var ss_trials = jsPsych.data.get().filter({
            trial_type: 'custom-stop-signal-plugin',
            block_i: block_ind,
            signal: 'yes'
        });
        var prop_ss_Correct = Math.round(ss_trials.filter({
            correct: true
        }).count() / ss_trials.count() * 1000) / 1000;

        // in the last block, we should not say that there will be a next block
        if (block_ind == (NexpBL + prac_offset) || grant_bonus == false) {
            var next_block_text = "<p class = block-text>Press space to continue...</p>";
        } else { // make a countdown timer
            var count = (bFBT / 1000);
            var counter;
            clearInterval(counter);
            counter = setInterval(timer, 1000); //1000 will run it every 1 second
            function timer() {
                count = count - 1;
                if (count <= 0) {
                    clearInterval(counter);
                }
                document.getElementById("timer").innerHTML = count;
            }
            // insert countdown timer
            var next_block_text = "<p class = block-text>You can take a short break, the next block starts in <span id='timer'>15</span> s</p>";
        }

        // the final text to present. Can also show correct and incorrect proportions if requested.

        // HMJ modified - keeping these calculations so that we can keep the "You've mastered this task!" feedback.
        var RT_bonus = bonus_RT_comp(avg_nsRT);
        var GO_bonus = bonus_multiplier(prop_ns_Missed + prop_ns_Incorrect);
        var STOP_bonus = bonus_multiplier(Math.abs(prop_ss_Correct - 0.5));
        block_bonus = Math.round(RT_bonus * GO_bonus * STOP_bonus);

        // block summary - HMJ modified
        if (bonus_feedback === 'simple') {
            var block_summary = "<div class = centerbox><br><br><br><br><br><br><br>";
            if (block_bonus == bonus_RT_comp(0)) { // perfect score
                block_summary = block_summary +
                    "<p class = center-block-text>Perfect! You've mastered this task!</p>";
            } else if (prop_ss_Correct < 0.5) { // when people's stop accuracy < 50% 
                if (block_ind < (NexpBL + prac_offset)) {
                    block_summary = block_summary +
                        "<p class = center-block-text>Try to <font color=red><b>be more accurate</b></font> to increase your performance.</p>"; // HMJ modified
                }
            } else { // when people's stop accuracy >= 50%
                if (block_ind < (NexpBL + prac_offset)) {
                    block_summary = block_summary +
                        "<p class = center-block-text>Try to <font color=red><b>go faster</b></font> to increase your performance.</p>"; // HMJ modified
                }
            }
            // HMJ modified - removed final line about total bonus, or lack of bonus due to practice

        } else {
            var block_summary = "<div class = centerbox>" +
                "<p class = block-text><b>Your performance is determined by your RT score, GO score, and STOP score.</b></p>" + // HMJ modified: bonus -> performance, multiplying -> your
                "<p class = block-text><b>GO TRIALS: </b></p>" +
                sprintf("<p class = block-text>Average response time = %d ms. <b>RT score</b>: %d.</p>", avg_nsRT, RT_bonus) +
                sprintf("<p class = block-text>Proportion misses/incorrects = %.2f (should be 0). <br><b>GO score</b>: %.2f.</p>", prop_ns_Missed + prop_ns_Incorrect, GO_bonus) +
                "<p class = block-text><b>STOP-SIGNAL TRIALS: </b></p>" +
                sprintf("<p class = block-text>Proportion correct stops = %.2f (should be 0.5). <br><b>STOP score</b>: %.2f.</p>", prop_ss_Correct, STOP_bonus);
                // HMJ modified - removed final lines about total bonus, or lack of bonus due to practice
            
        }
        // OLD
        // if (bonus_feedback === 'simple') {
        //     var block_summary = "<div class = centerbox><br><br><br><br><br><br><br>" +
        //         sprintf("<p class = center-block-text>You earned <b><font color=blue>%d cents</font></b> in this block.</p>", block_bonus);
        //     if (block_bonus == bonus_RT_comp(0)) { // perfect score
        //         block_summary = block_summary +
        //             "<p class = center-block-text>Perfect! You've mastered this task!</p>";
        //     } else if (prop_ss_Correct < 0.5) { // when people's stop accuracy < 50% 
        //         if (block_ind < (NexpBL + prac_offset)) {
        //             block_summary = block_summary +
        //                 "<p class = center-block-text>Try to <font color=red><b>be more accurate</b></font> to increase your bonus.</p>";
        //         }
        //     } else { // when people's stop accuracy >= 50%
        //         if (block_ind < (NexpBL + prac_offset)) {
        //             block_summary = block_summary +
        //                 "<p class = center-block-text>Try to <font color=red><b>go faster</b></font> to increase your bonus.</p>";
        //         }
        //     }
        //     if (grant_bonus) {
        //         block_summary = block_summary +
        //             sprintf("<p class = block-text><br>The total bonus is <b><font color=blue><span class='large'>%d</span> cents</font></b>.</p>", bonus + block_bonus);
        //     } else {
        //         block_summary = block_summary +
        //             '<p class = block-text><br>Since this block was practice, you do not get this bonus.</p>';
        //     }
        // } else {
        //     var block_summary = "<div class = centerbox>" +
        //         "<p class = block-text><b>Your bonus is determined by multiplying RT score, GO score, and STOP score.</b></p>" +
        //         "<p class = block-text><b>GO TRIALS: </b></p>" +
        //         sprintf("<p class = block-text>Average response time = %d ms. <b>RT score</b>: %d.</p>", avg_nsRT, RT_bonus) +
        //         sprintf("<p class = block-text>Proportion misses/incorrects = %.2f (should be 0). <br><b>GO score</b>: %.2f.</p>", prop_ns_Missed + prop_ns_Incorrect, GO_bonus) +
        //         "<p class = block-text><b>STOP-SIGNAL TRIALS: </b></p>" +
        //         sprintf("<p class = block-text>Proportion correct stops = %.2f (should be 0.5). <br><b>STOP score</b>: %.2f.</p>", prop_ss_Correct, STOP_bonus);
        //     if (grant_bonus) {
        //         block_summary = block_summary +
        //             sprintf("<p class = block-text><b>In this block, you earned extra <font color=red>%d (= %d x %.2f x %.2f) cents</font>.</b></p>", block_bonus, RT_bonus, GO_bonus, STOP_bonus) +
        //             sprintf("<p class = block-text><b>The total bonus is <font color=blue><span class='large'>%d</span> cents</font>.</b></p>", bonus + block_bonus);
        //     } else {
        //         block_summary = block_summary +
        //             sprintf("<p class = block-text><b>The performance-based bonus is <font color=red>%d (= %d x %.2f x %.2f) cents</font>.</b>", block_bonus, RT_bonus, GO_bonus, STOP_bonus) +
        //             ' Since this block was practice, you do not get this bonus.</p>';
        //     }
        // }
        block_summary = block_summary + next_block_text + '</div>';
        return block_summary;
    },
    on_finish: function () {
        trial_ind = 1; // reset trial counter
        block_ind = block_ind + 1; // next block

        // HMJ modified - always reset block bonus to 0, don't compute total bonus
        block_bonus = 0;
    }
};

// return the one-short-practice block timeline
function generate_first_practice_block() {
    var trial_seq = {
        timeline: [blank_ITI, held_down_node, stop_signal_trial, trial_feedback],
        timeline_variables: design,
        randomize_order: true,
        repetitions: NdesignReps_exp
    }
    return {
        timeline: [block_start_page, block_get_ready, trial_seq, block_feedback],
        randomize_order: false
    };
}

// return the four-main-blocks timeline
function generate_second_practice_block() {
    var start_second_practice_page = {
        type: "instructions",
        pages: [
            // HMJ modified - remove references to bonus
            '<div class = centerbox><p class = block-text>The first practice is finished. You will no longer receive immediate trial-by-trial feedback in the next practice.</p></div>',
            '<div class = centerbox><p class = block-text>There are one more practice block and ' + NexpBL.toString() + ' main blocks to go.' +
            ' <p class = block-text>Please click next when you are ready for the next practice block!</p></div>'
            // OLD
            // '<div class = centerbox><p class = block-text>The first practice is finished. You will no longer receive immediate trial-by-trial feedback in the next practice.</p></div>',
            // '<div class = centerbox><p class = block-text>There are one more practice block and ' + NexpBL.toString() + ' main blocks (with actual bonus) to go.' +
            // ' <b>IMPORTANT: You will get the bonus only during the main blocks.</b></p>' +
            // ' <p class = block-text>Please click next when you are ready for the next practice block!</p></div>'
        ],
        show_clickable_nav: true,
        on_finish: function () {
            // make sure not to grant bonus
            grant_bonus = false;
        }
    };
    var trial_seq = {
        timeline: [blank_ITI, held_down_node, stop_signal_trial, trial_feedback_to_negRT],
        timeline_variables: design,
        randomize_order: true,
        repetitions: NdesignReps_exp
    }
    return {
        timeline: [start_second_practice_page, block_start_page, block_get_ready, trial_seq, block_feedback],
        randomize_order: false
    };
}

// return the four-main-blocks timeline
var start_main_page = {
    type: "instructions",
    pages: [
        // HMJ modified - removed references to bonus
        '<div class = centerbox><p class = block-text>The practice is finished, and you are about to go through the main blocks.</p></div>',
        '<div class = centerbox><p class = block-text>Like in practice, at the end of each block, we will show you some information about your mean performance' +
        ' in the previous block.</p></div>',
        '<div class = centerbox><p class = block-text>There are ' + NexpBL.toString() + ' more blocks to go. Please try your best!</p>' + // HMJ modified - so, please -> Please
        ' <p class = block-text>Please click next when you are ready!</p></div>'
        // '<div class = centerbox><p class = block-text>The practice is finished, and you are about to go through the main blocks.</p></div>',
        // '<div class = centerbox><p class = block-text>Like in practice, at the end of each block, we will show you some information about your mean performance and' +
        // ' the <font color=red><b>resulting performance-based bonus</b></font> in the previous block.</p></div>', // bonus_desc_page1, bonus_desc_page2, bonus_desc_page3, bonus_desc_page4, bonus_desc_page5,
        // bonus_desc_simple,
        // '<div class = centerbox><p class = block-text>There are ' + NexpBL.toString() + ' more blocks to go. You will <b>keep all the bonus you earn</b> in these blocks. So, please try your best!</p>' +
        // ' <p class = block-text>Please click next when you are ready!</p></div>'
    ],
    show_clickable_nav: true,
    on_finish: function () {
        // in the main blocks, start granting bonus.
        grant_bonus = true;
    }
};

function generate_main_block(num_mainblock) {
    var trial_seq = {
        timeline: [blank_ITI, held_down_node, stop_signal_trial, trial_feedback_to_negRT],
        timeline_variables: design,
        randomize_order: true,
        repetitions: NdesignReps_exp
    }
    return {
        timeline: [block_start_page, block_get_ready, trial_seq, block_feedback],
        randomize_order: false,
        repetitions: num_mainblock
    };
}
