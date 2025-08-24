$OP = window.$OP ?? {};
$OP.init = function () {
	// the max length of nest objects displayed in console
	this.CONSOLE_OBJECT_NEST_LENGTH = 5;

	//flag that is set if the sketch is a looping sketch
	this.OP_ISLOOPINGSKETCH = null;

	//define if OP is served on OpenProcessing
	this.isOnOP = location.hostname.slice(-18) == 'openprocessing.org';

	let self = this;

	if (!this.isOnOP) {
		return;
	}

	//unhandledrejection default handler. This is overridden when stacktrace is later.
	window.addEventListener("unhandledrejection", $OP.unhandledRejectionHandler);

	//add keyboard shortcut support
	self.addScript($OP.baseURL("assets/20.0.1/js/vendor/mousetrap-master/mousetrap.min.js"), function () {
		//wait until load so that keyboardshortcuts and mousetrap is loaded
		self.addScript($OP.baseURL("assets/20.0.1/js/sketch/sketch_keyboardShortcuts.mjs"), function (res) {
			self.setupKeys();
		}, true);
	});

	//add stacktrace, then error handling
	self.addScript('/assets/js/vendor/node_modules/stacktrace-js/dist/stacktrace.min.js', function () {
		window.removeEventListener("unhandledrejection", $OP.unhandledRejectionHandler); //remove previous handler
		window.addEventListener("unhandledrejection", function (err) {
			try {
				StackTrace.fromError(err.reason)
					.then(function (stackArray) {
						// console.log(err.reason.message, stackArray);
						$OP.throwCustomError(err.reason.message, stackArray)
					})
					.catch(function () {
						$OP.throwCustomError("Uncaught error, most likely a file couldn't be loaded. Check the spelling of the filenames.")
					});
			} catch (err) {
				window.onerror("Uncaught error, most likely a file couldn't be loaded. Check the spelling of the filenames.", '', '', '', err); // call
			}
		});

		window.onerror = function (msg, url, lineNumber, columnNo, error) {
			let simpleError = [];
			if (typeof $OP.sketchConfig != 'undefined') {
				//see if a simple error that can directly be operated on
				//eg. typing "if*" throws unexpected identifier error, which stacktrace doesn't trace for some reason
				simpleError = $OP.sketchConfig.codeObjects.find(function (co) {
					return co.blobURL && co.blobURL.includes(url)
				});
			}
			if (simpleError) {
				$OP.throwCustomError(msg, [
					{
						'fileName': url,
						'columnNumber': columnNo,
						'lineNumber': lineNumber
					}
				]);
			} else { //last option
				StackTrace.fromError(error)
					.then(function (stackArray) {
						// console.log(msg, url, lineNumber, columnNo, error, error.stack, stackArray);
						$OP.throwCustomError(msg, stackArray)
					})
					.catch(function (err) {
						// stack couldn't be generated, simply display the message.
						$OP.throwCustomError(msg, [{
							'fileName': url,
							'columnNumber': columnNo,
							'lineNumber': lineNumber
						}]);
					});
			}
		}
	});

	$OP.setupMessages();

	//relay console functions to OP console
	$OP.hijackConsole();

	//prevent bounce on touch devices
	window.document.ontouchmove = function (event) {
		event.preventDefault();
	}
	window.addEventListener("load", function () {
		$OP.callParentFunction('sketchReady');
	});

}
$OP.unhandledRejectionHandler =
	function (err) {
		window.onerror("Uncaught error, most likely a file couldn't be loaded. Check the spelling of the filenames.", '', '', '', err);
	}

$OP._loopProtectDuration = 13000; //ms to reset loop list
$OP._loopProtectList = [];
$OP._loopProtectInterval = window.setInterval(function () {
	// clear the timer on all loops
	$OP._loopProtectList = [];
}, 500);
$OP.loopProtect = function (loc) {
	//for a given location, count each time it is called. If it is called more than 100 times, throw an error.
	// console.log('loopProtect', loc);
	let locString = `${loc.line}:${loc.ch}`;
	if (typeof $OP._loopProtectList[locString] == 'undefined') {
		$OP._loopProtectList[locString] = new Date();
	} else {
		//check if it is more than 5 seconds passed
		if ($OP._loopProtectList[locString] < new Date() - $OP._loopProtectDuration) {
			$OP._loopProtectList = []; //reset, because other loops were frozen during above as well.

			//note the zero-width space on "loop". This is to prevent p5js friendly error from triggering. 
			throw new InfiniteLoopError($OP._loopProtectDuration, '', loc.line, loc.ch);

		}
	}
}

class InfiniteLoopError extends Error {
	constructor(duration = 0, ...args) {
		let seconds = Math.round(duration / 100) / 10;
		super(`Exiting potential infinite l​oop (> ${seconds} seconds)! 😱 \n(You can disable l​oop protection in sketch settings.)`, ...args);
		this.type = "InfiniteLoopError";
	}
}

$OP.setupMessages = function () {
	window.addEventListener("message", function (event) {
		let messageType = event.data.messageType;
		let data = null;
		try {
			data = JSON.parse(event.data.message);
		} catch (error) {
			data = null;
		}
		switch (messageType) {
			case 'OPC_update':
				if (typeof OPC !== 'undefined') {
					OPC.set(data.name, data.value);
				}
				break;
			case 'OPC_buttonPressed':
				if (typeof OPC !== 'undefined') {
					OPC.buttonPressed(data.name, data.value);
				}
				break;
			case 'OPC_buttonReleased':
				if (typeof OPC !== 'undefined') {
					OPC.buttonReleased(data.name, data.value);
				}
				break;
			case 'reload':
				window.location.reload();
				break;
			case 'muteSketch':
				data ? $OP.pauseAudio() : $OP.resumeAudio();
				break;
			case 'giveSketchFocus':
				$OP.giveSketchFocus();
				break;
			case 'pauseSketch':
				$OP.pauseSketch(data);
				break;
			case 'keepAudioOff':
				$OP.keepAudioOff();
				break;
			case 'takeScreenshot':
				$OP.takeScreenshot();
				break;
			case 'initRecording':
				if (window.Mousetrap && $OP && $OP.keyboardShortcuts) {
					console.log("init recording");
					//prepping R key for recording video
					Mousetrap.bind($OP.keyboardShortcuts.recordVideo.bind, function (e) {
						//communicate with parent to initiate recording and make UI updates like progressbar
						e.preventDefault();
						$OP.callParentFunction('recordingStartRequested');
					});
					//prepping C key for recording screenshot
					Mousetrap.bind($OP.keyboardShortcuts.takeScreenshot.bind, function (e) {
						e.preventDefault();
						$OP.takeScreenshot();
					});
					// prep escape for closing modal
					Mousetrap.bind("esc", function (e) {
						console.log("exit recorder");
						e.preventDefault();
						$OP.callParentFunction('exitRecorder');
					});
				}
				break;
			case 'userAuthorized':
				if (typeof $OP.userInfoAuthorized == 'function') { //legacy
					$OP.userInfoAuthorized(data);
				} else {
					OpenProcessing.userAuthorized(data); //resolves the promise
				}
				break;
			case 'recordGIF':
				$OP.recordGIF();
				break;
			case 'recordVideo':
				$OP.recordVideo(data.mime, data.extension, data.quality);
				break;
			case 'stopRecording':
				$OP.stopRecording(data);
				break;
			case 'updateDeviceOrientation':
				try { //on sketch reload, event is sent while p5 and instand still not created. 
					OpenProcessing.deviceMotionAuthorized(data); //resolve promise
					p5.instance._ondeviceorientation(data);
				} catch (error) {
					//probably p5 is not ready yet.
				}
				break;
			case 'updateDeviceMotion':
				try { //on sketch reload, event is sent while p5 and instand still not created. 
					OpenProcessing.deviceMotionAuthorized(data); //resolve promise
					p5.instance._ondevicemotion(data);
				} catch (error) {
					//probably p5 is not ready yet.
				}
				break;
			default:
				break;
		}
	});
}


//quick script added
$OP.addScript = function (url, onloadF = function () { }, module = false) {
	//order below is important
	let sc = document.createElement('script')
	sc.setAttribute("type", "text/javascript")
	sc.setAttribute("crossorigin", "anonymous")
	sc.setAttribute("language", "javascript")
	if (module) sc.setAttribute("type", "module");
	document.getElementsByTagName("head")[0].appendChild(sc);
	sc.onload = onloadF;
	sc.setAttribute("src", url);
}

//uses sidekick.js to ask for user info
$OP.askUserInfo = function (data) {
	this.addScript("https://cdn.jsdelivr.net/gh/msawired/OpenProcessing-Sidekick@latest/sidekick.js", function () {
		window.OpenProcessing.requestUserInfo(data);
	})
}

$OP.hijackConsole = function () {
	let self = this;
	let _log = console.log,
		_error = console.error,
		_clear = console.clear;

	console.log = function () {
		let args = arguments;
		for (let i = 0; i < arguments.length; i++) {
			//check if argument is p5js friendly error. If so, replace any blob urls into code titles.
			let isString = args[i] && (typeof args[i] === 'string' || args[i] instanceof String);

			//if string start with "🌸 p5.js says", replace urls with code titles
			if (isString && args[i].startsWith('\n🌸 p5.js') && $OP.sketchConfig && $OP.sketchConfig.codeObjects) {
				$OP.sketchConfig.codeObjects.forEach(co => {
					args[i] = args[i].replaceAll(co.blobURL, co.title);
					args[i] = args[i].replaceAll(co.blobName, co.title);
				});
			}

			$OP.callParentFunction('showMessage', {
				'msg': args[i],
				'noLineBreak': false, //line break only on the last one
				'class': 'log'
			});
		}

		return _log.apply(console, arguments);
	};
	console.info = function () {
		for (let i = 0; i < arguments.length; i++) {
			$OP.callParentFunction('showMessage', {
				'msg': arguments[i],
				'noLineBreak': false, //line break only on the last one
				'class': 'info'
			});
		}

		return _log.apply(console, arguments);
	};
	console.warn = function () {
		for (let i = 0; i < arguments.length; i++) {
			$OP.callParentFunction('showMessage', {
				'msg': arguments[i],
				'noLineBreak': false, //line break only on the last one
				'class': 'warning'
			});
		}

		return _log.apply(console, arguments);
	};



	var callback = function (stackframes) {
		// not sure if below is working...
		$OP.throwCustomError(stackframes);
	};

	console.error = function () {
		for (let i = 0; i < arguments.length; i++) {
			let arg = arguments[i];
			StackTrace.get()
				.then(function (stackArray) {
					$OP.throwCustomError(arg, stackArray)
				})
				.catch(self.throwCustomError);
		}
		return _error.apply(console, arguments);
	};
	console.clear = function () {
		$OP.callParentFunction('clearConsole');
		return _clear.apply(console, arguments);
	};
}

$OP.getEchoServerURL = function (roomID = 0) {
	return `//echo.openprocessing.org:30000?sketch=${roomID}`;
}

$OP.makeTransmittable = function (obj, nestCounter = 0) {
	//go through object values and make them transmittable to parent
	switch (typeof obj) {
		case 'object':
			if (nestCounter == $OP.CONSOLE_OBJECT_NEST_LENGTH) {
				return 'Object (too many nested objects, can not display)';
			} else {
				//typeof null == 'object' so check for null first
				if (obj == null) {
					return null
				};

				//create shallow copy of the object/array, to prevent any updated attributes by nesting effecting parent objects.
				//e.g. jane.self = jane;
				obj = Array.isArray(obj) ? Array.from(obj) : Object.assign({}, obj);

				// iterate over object attributes
				nestCounter++;
				let keys = Object.keys(obj);
				for (let key in keys) {
					obj[keys[key]] = $OP.makeTransmittable(obj[keys[key]], nestCounter);
				}
				return obj;
			}
			break;
		case 'function':
			return obj.toString().substring(0, 25) + '…';
			break;
		default:
			return obj;
			break;

	}


}
OP_makeTransmittable = $OP.makeTransmittable; //fallback support for old OPC versions.

$OP.getAudioContext = function () {
	//try tonejs first
	if (typeof Tone != 'undefined' && Tone.getContext) {
		return Tone.getContext();
	}

	if (typeof p5 != 'undefined' && p5.instance && p5.instance.getAudioContext) {
		return p5.instance.getAudioContext();
	}
	return null;

}
// this function auto-runs
$OP.setupAudioContext = function () {
	// const AudioContext = window.AudioContext || window.webkitAudioContext;
	// const audioContext = new AudioContext();
	// if(typeof Tone != 'undefined'){
	// 	Tone.setContext(audioContext);
	// }

	let audioCtxInterval = window.setInterval(function () {
		let audioCtx = $OP.getAudioContext();

		if (audioCtx) {
			switch (audioCtx.state) {
				case "suspended":
					$OP.callParentFunction('showSpeaker', false);
					break;

				case "closed":
					$OP.callParentFunction('hideSpeaker', true);
					break;

				default:
					//check if it is muted
					$OP.callParentFunction('showSpeaker', !audioCtx.destination.mute);
					break;
			}
		}

	},
		1000);
}();

$OP.callParentFunction = function (functionName, arg = {}) {
	//this.console.log(arg);
	// below might fail if arg can not be cloned to be sent over.
	// console.profile('callParentFunction');
	try {
		//try sending as is
		window.parent.postMessage({
			'messageType': functionName,
			'message': $OP.makeTransmittable(arg, 0)
		}, '*');

	} catch (error) {
		// console.log('datacloneerror?', error);
		let lineNumber = null;
		if (error.stack && error.stack.split('about:srcdoc:').length > 1) {
			lineNumber = error.stack.split('about:srcdoc:')[1].split(':')[0];
		}
		// console.log(error);
		let err = {
			'msg': '' + error,
			'url': null,
			'lineNumber': lineNumber,
			'columnNo': null,
			'error': ''//JSON.stringify(error)
		}
		$OP.callParentFunction('showError', err);
	}
	// console.profileEnd('callParentFunction');

}

$OP.pauseSketch = function (bool = null) {
	try {
		if (typeof p5 != 'undefined') {
			if (bool === false) {
				//unpause only if it is originally a looping sketch
				if (OP_ISLOOPINGSKETCH && !p5.instance.isLooping()) {
					p5.instance.loop();
				}
			} else { //pause sketch, either on bool = true or bool = null
				if (p5.instance.isLooping()) {
					OP_ISLOOPINGSKETCH = true;
					p5.instance.noLoop();
				}

				//stop audio
				$OP.stopAudio();
			}

		}
		if (typeof Processing != 'undefined') {
			bool === true ? Processing.getInstanceById('pjsCanvas').noLoop() : Processing.getInstanceById('pjsCanvas').loop();
		}

	} catch (e) {

	}
}

$OP.keepAudioOff = function () {
	window.setInterval(function () {
		//stop audio
		$OP.stopAudio();
	}, 1000);

}

$OP.pauseAudio = function () {
	//reduce volume to 0
	let audioCtx = $OP.getAudioContext();
	if (audioCtx) {
		audioCtx.destination.mute = true;
		try {
			audioCtx.suspend();
		}
		catch (e) {
			// probably using buffer source, which doesn't support suspend. (tonejs)
		}
	}
	$OP.callParentFunction('showSpeaker', false);
}
$OP.resumeAudio = function () {
	//reduce volume to 100
	let audioCtx = $OP.getAudioContext();

	if (audioCtx) {
		audioCtx.destination.mute = false;
		try {
			audioCtx.resume();
		}
		catch (e) {
			// probably using buffer source, which doesn't support resume. (tonejs)
		}
	}
	$OP.callParentFunction('showSpeaker', true);
}

// Fully closes the audiocontext. Can not be resumed.
$OP.stopAudio = function () {
	const context = $OP.getAudioContext();
	context && context.state == 'running' && context.close();
}


$OP.scriptLoadError = function (el) {
	$OP.throwCustomError(el.src + ' can not be loaded. Please make sure resource exists and it supports cross-domain requests.');
}
//add onerror to existing scripts before they load
let scripts = document.getElementsByTagName('script');
for (const sc of scripts) {
	sc.onerror = $OP.scriptLoadError;
	sc.setAttribute("onerror", "$OP.scriptLoadError(this)")
}

$OP.throwCustomError = function (msg, stackArray = []) {

	let OP_error = {
		'msg': msg,
		'stackArray': stackArray, //array of error stack items { 'title': 'mySketch', url: 'as23sser3-...', lineNumber: 2} 
	};

	//filter out internal files
	OP_error.stackArray = OP_error.stackArray.filter(function (st) {
		return !st.fileName.includes('sketch_preview.js') && !st.fileName.includes('stacktrace.min.js')
	})

	//TODO move below to sketch_engine.js and make it work without $OP.sketchConfig
	//find relevant code references in the rest
	OP_error.stackArray.forEach(stackArray => {
		try {
			//see if the stack url is in the provided codeObjects
			let co = $OP.sketchConfig.codeObjects.find(function (co) {
				return co.blobURL && co.blobURL.includes(stackArray.fileName);
			});
			stackArray.title = co ? co.title : null;
			stackArray.fileName = stackArray.title ?? stackArray.fileName;
			stackArray.codeID = co ? co.codeID : null;

			//while at it, adjust line number by removing any loopProtect extras
			if (stackArray.codeID !== null) {
				//loopProtect adds two new lines for every two "loopProtect.protect" occurences
				let codeUntilError = co.code.split('\n').slice(0, stackArray.lineNumber).join('\n');
				let noOfLoopProtect = (codeUntilError.match(/loopProtect.protect/g) || []).length;
				noOfLoopProtect -= noOfLoopProtect % 2; //make it every other loop
				stackArray.lineNumber -= noOfLoopProtect;
			}
		} catch (error) {
			//ignore
		}

	});

	//note that error is a weird object. May look empty, but error.stack is full.
	$OP.callParentFunction('showError', OP_error);

	console.groupEnd();
}


$OP.giveSketchFocus = function () { //this is run by iframe_giveFocus.js. That js loaded if runSketch(..,true) is called.
	let c = document.getElementsByTagName("canvas");
	// this.console.log(document.activeElement);

	if (c.length > 0) {
		c[0].setAttribute('tabindex', 0);
		// c[0].focus();
		if (this.document.activeElement == c[0] && $OP.giveSketchFocusInterval) {
			// this.console.log(document.activeElement);
			window.clearInterval($OP.giveSketchFocusInterval);
		}
	}
	// window.addEventListener("keydown", function (e) {
	// not sure if this helps at all.  !no, it takes focus away from p5.dom input fields
	// c[0].focus();
	// });


}

$OP.setupKeys = function () {
	if (!window.Mousetrap) {
		// console.log('Mousetrap not found. Skipping key setup.');
		return;
	}
	if (!$OP.keyboardShortcuts) {
		// console.log('keyboardShortcuts not found. Skipping key setup.');
		return;
	}
	//fullscreen
	Mousetrap.bind($OP.keyboardShortcuts.fullscreen.bind, function (e) {
		$OP.callParentFunction('mousetrap', $OP.keyboardShortcuts.fullscreen.bind);
		return false;
	});
	//save
	Mousetrap.bind($OP.keyboardShortcuts.save.bind, function (e) {
		$OP.callParentFunction('mousetrap', $OP.keyboardShortcuts.save.bind);
		return false;
	});
	//exit fullscreen
	Mousetrap.bind('escape', function (e) {
		$OP.callParentFunction('mousetrap', 'escape');
		return false;
	});

	//play
	Mousetrap.bind($OP.keyboardShortcuts.play.bind, function (e) {
		$OP.callParentFunction('mousetrap', $OP.keyboardShortcuts.play.bind);
		return false;
	});
	//code
	Mousetrap.bind($OP.keyboardShortcuts.code.bind, function (e) {
		$OP.callParentFunction('mousetrap', $OP.keyboardShortcuts.code.bind);
		return false;
	});
	//settings
	Mousetrap.bind($OP.keyboardShortcuts.settings.bind, function (e) {
		$OP.callParentFunction('mousetrap', $OP.keyboardShortcuts.settings.bind);
		return false;
	});
	//layout
	Mousetrap.bind([$OP.keyboardShortcuts.layout.bind], function (e) {
		$OP.callParentFunction('mousetrap', $OP.keyboardShortcuts.layout.bind);
		return false;
	});
	Mousetrap.bind('space', function (e) {
		$OP.callParentFunction('mousetrap', 'space');
	});
}


//---RECORDER FUNCTIONS----
$OP.videoRecorder = null;
$OP.stopRecording = function (type) {
	if (type == 'video' && $OP.videoRecorder) {
		$OP.videoRecorder.stop();
	} else if (type == 'GIF' && window.gif) {
		window.clearInterval(window.GIFframer);
		window.gif.recording = false;
		window.gif.render();
	}
}
$OP.recordGIF = function (fps = 60) {
	// console.log('GIF init');

	window.gif = new GIF({
		workers: 2,
		quality: 8,
		repeat: 0,
		debug: false, //TODO update url below
		workerScript: 'https://preview-local.openprocessing.org/assets/js/vendor/gif.js-master/dist/gif.worker.js'
	});

	window.gif.recording = true;
	window.GIFframer = window.setInterval(function () {
		// console.log('adding frame');
		if (window.gif.recording) {
			window.gif.addFrame($OP.getCanvas(), {
				delay: 1000 / fps,
				copy: true
			});
		}
	}, 1000 / fps);

	window.gif.on('progress', function (p) {
		return $OP.callParentFunction('recordingRenderProgress', p);
	});
	window.gif.on('finished', function (blob) {
		window.clearInterval(window.GIFframer);
		//allow download 
		// let src = URL.createObjectURL(blob);
		//setupEditSketchPanel();
		// updateGIF(src);
		// console.log('finished');
		window.uploadRecording(blob, 'gif');
	});
}
$OP.recordVideo = function (mime, extension, quality) { //vps and aps is in MB
	let vidBPS = 50000000 * quality; //~3.8MB per sec
	let fps = 60;
	let canvas = $OP.getCanvas();
	var videoStream = canvas.captureStream(fps);
	$OP.videoRecorder = new MediaRecorder(videoStream, {
		mimeType: mime,
		videoBitsPerSecond: vidBPS
	});

	var chunks = [];
	$OP.videoRecorder.ondataavailable = function (e) {
		chunks.push(e.data);
	};

	$OP.videoRecorder.onstop = function (e) {
		$OP.callParentFunction('videoUploading');
		var blob = new Blob(chunks, {
			mimeType: mime
		});
		if (blob.size == 0) {
			$OP.callParentFunction('showAjaxError', {
				'msg': 'Recording is empty: Please make sure your sketch is drawing continuously using the "draw" function.'
			});
		} else {
			chunks = [];
			$OP.uploadRecording(blob, extension);
		}
	};

	$OP.videoRecorder.start();
}
$OP.uploadRecording = function (blob, extension) {
	//do not use callParentFunction, as it reduces the blob to something else.
	window.parent.postMessage({
		'messageType': 'recordingReady',
		'message': { blob, extension }
	}, '*');
}

$OP.getCanvas = function () {
	let canvas = document.getElementById('pjsCanvas');
	if (!canvas) {
		canvas = document.getElementsByClassName('p5Canvas');
		canvas = canvas.length > 0 ? canvas[0] : false;
	}
	if (!canvas) {
		//just take the first one if still not found. e.g. custom canvas implementations like /sketch/776984
		canvas = document.getElementsByTagName('canvas');
		canvas = canvas.length > 0 ? canvas[0] : false;
	}
	return canvas;
}

$OP.mergeCanvases = function () {
	// Find all canvas elements on the page
	const canvases = [...document.querySelectorAll('canvas')];

	//reverse the order of canvases, so that the topmost canvas is drawn last.
	canvases.reverse();

	if (canvases.length === 0) {
		console.warn("No canvas elements found on the page.");
		return null;
	}

	// Determine max width & height needed
	let maxWidth = 0, maxHeight = 0;
	canvases.forEach(canvas => {
		maxWidth = Math.max(maxWidth, canvas.width);
		maxHeight = Math.max(maxHeight, canvas.height);
	});

	// Create target canvas (not appended to DOM)
	const targetCanvas = document.createElement('canvas');
	targetCanvas.width = maxWidth;
	targetCanvas.height = maxHeight;
	const targetCtx = targetCanvas.getContext('2d');

	// Filter out canvases by type
	const canvasData = canvases.map(canvas => {
		const ctx2d = canvas.getContext('2d');
		const ctxWebGL = canvas.getContext('webgl') || canvas.getContext('webgl2');

		return {
			canvas,
			type: ctx2d ? '2d' : ctxWebGL ? 'webgl' : 'unknown'
		};
	});

	// Fill with white only if there's at least one transparent 2D canvas
	if (canvasData.some(c => c.type === '2d')) {
		targetCtx.fillStyle = 'white';
		targetCtx.fillRect(0, 0, targetCanvas.width, targetCanvas.height);
	}

	// Process and draw each canvas
	let drawPromises = canvasData.map(({ canvas, type }) => {
		if (type === '2d') {
			// Draw 2D canvas directly
			targetCtx.drawImage(canvas, 0, 0);
			return Promise.resolve();
		} else if (type === 'webgl') {
			// WebGL: Convert to an image and draw
			return new Promise(resolve => {
				const img = new Image();
				img.onload = () => {
					targetCtx.drawImage(img, 0, 0);
					resolve();
				};
				img.src = canvas.toDataURL(); // Extract WebGL as image
			});
		}
	});

	// Wait for all WebGL images to load
	return Promise.all(drawPromises).then(() => {
		return targetCanvas;
	});
}
$OP.takeScreenshot = function () {
	let extension = "image/jpeg";
	let quality = 0.9;
	$OP.mergeCanvases().then(function (canvas) {
		canvas.toBlob(async (blob) => {
			if (!blob) {
				$OP.callParentFunction('showError', {
					'msg': 'Error taking screenshot',
					'error': 'Failed to create Blob from canvas.'
				});
				return;
			}
			window.parent.postMessage({
				'messageType': 'screenshotReady',
				'message': { blob, extension }
			}, '*');
		}, extension, quality);
	}).catch(function (error) {
		$OP.callParentFunction('showError', {
			'msg': 'Error taking screenshot',
			'error': error
		});
	});
}

$OP.baseURL = function (uri = '') {
	let loc = window.location.hostname;
	//remove preview
	if (loc.includes('openprocessing.org')) {
		loc = loc.replace('preview-', '');
		return `https://${loc}/${uri}`;
	} else {
		return 'https://openprocessing.org/' + uri //set to main domain
	}
}
$OP.init();