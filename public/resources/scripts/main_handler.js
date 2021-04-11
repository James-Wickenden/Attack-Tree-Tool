'use safe';
var socket = io();

function SetUpMainLinks() {
    var private_editor = document.getElementById('main_private_editor');
    var create_group = document.getElementById('main_create_group');
    var join_group = document.getElementById('main_join_group');
    
    private_editor.onclick = function(evt) { LoadPrivateEditor(evt) };
    create_group.onclick = function(evt) { CreateGroupEditor(evt) };
    join_group.onclick = function(evt) { JoinGroupEditor(evt) };
};

function LoadPrivateEditor(evt) {
    evt.preventDefault();
    sessionStorage.setItem('is_private', 'true');
    sessionStorage.removeItem('group_key');
    console.log(sessionStorage.getItem('is_private'));
    console.log(sessionStorage.getItem('group_key'));
    window.location.href = '/tree_builder';
};

function CreateGroupEditor(evt) {
    evt.preventDefault();
    console.log(socket);
    socket.emit('group_key_avl_req', '1234');
};

function JoinGroupEditor(evt) {
    evt.preventDefault();

};

socket.on('group_key_avl', function (data) {
    console.log(data);
});