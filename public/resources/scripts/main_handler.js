'use safe';
var socket = io();

function SetUpMainLinks() {
    var private_editor = document.getElementById('main_private_editor');
    var create_group = document.getElementById('main_create_group');
    var join_group = document.getElementById('main_join_group');
    
    private_editor.onclick = function(evt) { LoadPrivateEditor(evt) };
    create_group.onclick = function(evt) { SetupGroupInput(evt, create_group) };
    join_group.onclick = function(evt) { SetupGroupInput(evt, join_group) };
};

function LoadPrivateEditor() {
    sessionStorage.setItem('is_private', 'true');
    sessionStorage.removeItem('group_key');
    console.log(sessionStorage.getItem('is_private'));
    console.log(sessionStorage.getItem('group_key'));
    window.location.href = '/tree_builder';
};

function SetupGroupInput(evt, sender) {
    evt.preventDefault();
    document.getElementById('main_create_group').style.backgroundColor = '#bbb';
    document.getElementById('main_join_group').style.backgroundColor = '#bbb';
    sender.style.backgroundColor = 'green';

    var group_input = document.getElementById('right_options');
    group_input.style.display = 'flex';

};

function CreateGroupEditor() {
    console.log(socket);
    socket.emit('group_key_avl_req', '1234');
    SetupGroupInput();
};

function JoinGroupEditor(evt) {
    evt.preventDefault();
    SetupGroupInput();
};

socket.on('group_key_avl', function (data) {
    console.log(data);
});