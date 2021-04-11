'use safe';

var socket;

function SetUpMainLinks() {
    SetUpSocket();
    SetUpHoverHighlight();

    var private_editor = document.getElementById('main_private_editor');
    var create_group = document.getElementById('main_create_group');
    var join_group = document.getElementById('main_join_group');
    
    private_editor.onclick = function(evt) { LoadOption(evt, this, 'private') };
    create_group.onclick = function(evt) { LoadOption(evt, this, 'create_group') };
    join_group.onclick = function(evt) { LoadOption(evt, this, 'join_group') };
};

// When an option is clicked, set up the session storage and reset css for highlighting.
function LoadOption(evt, sender, mode) {
    evt.preventDefault();
    sessionStorage.setItem('mode', mode);
    sessionStorage.removeItem('group_key');
    OpenButton(sender);
};

// Handles clicking on buttons and stores the active button
function OpenButton(sender) {
    SetUpHoverHighlight();

    sender.className += ' active';
    sender.style.backgroundColor = 'green';
    sender.onmouseleave = function(){};

    // Manages the start button css and handlers
    var start_button = document.getElementById('main_group_start');
    start_button.disabled = false;
    start_button.style.cursor = 'pointer';
    start_button.onmouseenter = function() { this.style.backgroundColor = 'green'; };
    start_button.onmouseleave = function() { this.style.backgroundColor = '#bbb'; };
    start_button.onclick = function(evt) {
        evt.preventDefault();
        // Private sessions can open straight away.
        // Group sessions must first have the key verified;
        // creating group only if that key is not in use, joining only if that group exists.
        if (sessionStorage.getItem('mode') == 'private') {
            OpenEditor(true, null);
        }
        else {
           RequestGroupAvailablility(); 
        }
    };

    document.getElementById('main_group_status').innerText = '';
    var group_key_input = document.getElementById('main_group_key');
    if (sessionStorage.getItem('mode') == 'private') {
        group_key_input.disabled = true;
    }
    else {
        group_key_input.disabled = false;
    }
};

// Sends a socket message to the server asking for that group availability
function RequestGroupAvailablility() {
    var group_key = document.getElementById('main_group_key').value;
    if (group_key == '') {
        document.getElementById('main_group_status').innerText = 'Enter a group code, or start a private session.';
        return;
    }
    socket.emit('group_key_avl_req', group_key);
};

// When hovering over the main buttons, they should be green
// For some reason, clicking buttons and mousing over the others breaks the hover css, so this is a workaround.
function SetUpHoverHighlight() {
    var main_buttons = document.getElementsByClassName('option_buttons');
    for (i = 0; i < main_buttons.length; i++) {
        main_buttons[i].style.backgroundColor = '#bbb';
        main_buttons[i].className = main_buttons[i].className.replace(' active', '');
        main_buttons[i].onmouseenter = function() { this.style.backgroundColor = 'green'; };
        main_buttons[i].onmouseleave = function() { this.style.backgroundColor = '#bbb'; };
    }
};

// Sets up socket and its method for receiving messages from the server.
function SetUpSocket() {
    socket = io();
    socket.on('group_key_avl', function (data) {
        OpenEditor(false, data);
    });
};

// Finally, open either a private session or a group session.
function OpenEditor(private, data) {
    if (private) {
        window.location.href = '/tree_builder';
    }
    else {
        switch (sessionStorage.getItem('mode')) {
            case 'join_group': 
                if (data.OK == 'OK') {
                    document.getElementById('main_group_status').innerText = 'No such group with that code.';
                }
                else {
                    sessionStorage.setItem('group_key', data.group_key);
                    window.location.href = '/tree_builder';
                }
                break;
            case 'create_group':
                if (data.OK == 'OK') {
                    sessionStorage.setItem('group_key', data.group_key);
                    window.location.href = '/tree_builder';
                }
                else {
                    document.getElementById('main_group_status').innerText = 'That group code is already in use.';
                }   
                break;
        };
    }
};