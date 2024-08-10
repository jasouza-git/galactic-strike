var q = x => document.querySelector(x);

// Safari & iOS Support
if(['iPad Simulator','iPhone Simulator','iPod Simulator','iPad','iPhone','iPod'].includes(navigator.platform) ||
   (navigator.userAgent.includes("Mac") && "ontouchend" in document)) document.body.classList.add('safari_user');
/*
function iOS() {
  return [
    'iPad Simulator',
    'iPhone Simulator',
    'iPod Simulator',
    'iPad',
    'iPhone',
    'iPod'
  ].includes(navigator.platform)
  // iPad on iOS 13 detection
  || (navigator.userAgent.includes("Mac") && "ontouchend" in document)
}
*/

// Generate stars
var sr = q('#star');
var sz = 300;
sr.setAttribute('width', sz);
sr.setAttribute('height', sz);
var sx = sr.getContext('2d');
for (var i = 0; i < 200; i++) {
    sx.globalAlpha = Math.pow(Math.random(), 2);
    var t = Math.pow(1 - 2 * Math.random(), 3);
    sx.fillStyle = `rgb(${t > 0 ? 255 : 255 + 100 * t},${255 - 50 * Math.abs(t)},${t < 0 ? 255 : 255 - 100 * t})`;
    sx.beginPath();
    sx.arc(Math.random() * sz, Math.random() * sz, Math.random() * 1.5, 0, 2 * Math.PI);
    sx.fill();
}
// Menu
var pname;
q('#menu>input').onkeyup = function(e){
    q('#menu>span').innerHTML = '';
    if (e.keyCode == 13) q('#menu>button').click();
};
q('#menu>button').onclick = function () {
    var room = q('#room').value;
    pname = q('#name').value;
    if (pname == '') {
        q('#menu>span').innerHTML = 'Name cannot be blank';
        return;
    } else {
        sock.emit('play_req', { room: room, id: id, name:pname });
        sock.on('play_res', data => {
            console.log('RES', data);
            if (data.id == id) {
                if (data.error == undefined) {
                    q('#menu').classList.remove('on');
                    q('#play').classList.add('on');
                    if (document.body.requestFullscreen) document.body.requestFullscreen();
                    else if (document.body.webkitRequestFullscreen) document.body.webkitRequestFullscreen();
                    else if (document.body.msRequestFullscreen) document.body.msRequestFullscreen();
                    sock.off('play_res');
                } else q('#menu>span').innerHTML = data.error;
            }
        });
    }
};

// Server
var sock = io();
var id = Number(new Date());

// Controller
var moveposi = [0, 0];
var faceposi = [0, 0];
var velo = [0, 0, 0];
var appl = [false, false, false];
var maxdrag = 100;
var maxacce = 150;
q('#move').addEventListener('touchstart', e => {
    moveposi = [e.targetTouches[0].clientX, e.targetTouches[0].clientY];
    q('#jmove').classList.add('on');
    q('#jmove').style.width =  '0px';
    q('#jmove').style.height =  '0px';
    q('#jmove').style.left =  `${e.targetTouches[0].clientX}px`;
    q('#jmove').style.top =  `${e.targetTouches[0].clientY}px`;
});
q('#move').addEventListener('touchmove', e => {
    var deltax = moveposi[0] - e.targetTouches[0].clientX;
    var deltay = moveposi[1] - e.targetTouches[0].clientY;
    var h = Math.hypot(deltax, deltay);
    if (h > maxdrag) {
        deltax *= maxdrag / h;
        deltay *= maxdrag / h;
        h = maxdrag;
    }
    var a = 180+180*Math.atan2(deltax, -deltay)/Math.PI;
    q('#jmove').style.width =  `${h*2}px`;
    q('#jmove').style.height =  `${h*2}px`;
    q('#jmove').style.left =  `${moveposi[0]-h}px`;
    q('#jmove').style.top =  `${moveposi[1]-h}px`;
    q('#jmove').style.transform =  `rotate(${a}deg)`;
    velo[0] = maxacce * (-deltay) / maxdrag;
    velo[1] = maxacce * deltax / maxdrag;
    appl[0] = true;
    appl[1] = true;
});
q('#move').addEventListener('touchend', e =>{
    appl[0] = false;
    appl[1] = false;
    q('#jmove').classList.remove('on');
});
q('#face').addEventListener('touchstart', e => {
    faceposi = [e.targetTouches[0].clientX, e.targetTouches[0].clientY];
    q('#jface').classList.add('on');
    q('#jface').style.width =  '0px';
    q('#jface').style.height =  '0px';
    q('#jface').style.left =  `${e.targetTouches[0].clientX}px`;
    q('#jface').style.top =  `${e.targetTouches[0].clientY}px`;
});
q('#face').addEventListener('touchmove', e => {
    var deltax = faceposi[0] - e.targetTouches[0].clientX;
    var deltay = faceposi[1] - e.targetTouches[0].clientY;
    var h = Math.min(maxdrag, Math.hypot(deltax, deltay));
    var a = Math.PI+Math.atan2(deltax, -deltay);//Math.PI+Math.atan2(-deltax, deltay);
    q('#jface').style.width =  `${h*2}px`;
    q('#jface').style.height =  `${h*2}px`;
    q('#jface').style.left =  `${faceposi[0]-h}px`;
    q('#jface').style.top =  `${faceposi[1]-h}px`;
    q('#jface').style.transform =  `rotate(${180*a/Math.PI}deg)`;
    velo[2] = a+Math.PI;
    appl[2] = true;
});
q('#face').addEventListener('touchend', e =>{
    appl[2] = false;
    q('#jface').classList.remove('on');
    
});
setInterval(()=>{
    sock.emit('play_vel', { id: id, name: pname, velo: velo, appl: appl});
}, 100);