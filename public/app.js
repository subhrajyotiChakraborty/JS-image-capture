var videoElement = document.querySelector("video");
var videoSelect = document.querySelector("select#videoSource");
var cameraTrigger = document.querySelector("#camera--trigger");
var cameraSensor = document.querySelector("#camera--sensor");
var cameraOutput = document.querySelector("#camera--output");
var parentWindowEvent;
var confirmation;
var timer;
videoSelect.onchange = getStream;

getStream().then(getDevices).then(gotDevices);
// createInterval();

cameraTrigger.onclick = function () {
  cameraSensor.width = videoElement.videoWidth;
  cameraSensor.height = videoElement.videoHeight;
  cameraSensor.getContext("2d").drawImage(videoElement, 0, 0);
  cameraOutput.src = cameraSensor.toDataURL("image/webp");
  cameraOutput.classList.add("taken");

  cameraSensor.width = 0;
  cameraSensor.height = 0;

  //-----------//
  // Uncomment below codes where scan is not possible

  // parentWindowEvent &&
  //   parentWindowEvent.source &&
  //   parentWindowEvent.source.postMessage("1234567", parentWindowEvent.origin);

  // window.close();

  //-----------//

  // Comment out below line where scan is not possible
  processImage(cameraOutput.src);
};

window.addEventListener(
  "message",
  (event) => {
    parentWindowEvent = event;
  },
  false
);

function processImage(imageData) {
  Quagga.decodeSingle(
    {
      decoder: {
        readers: [
          "code_128_reader",
          "ean_reader",
          "ean_8_reader",
          "code_39_reader",
          "code_39_vin_reader",
          "codabar_reader",
          "upc_reader",
          "upc_e_reader",
          "i2of5_reader",
          "2of5_reader",
          "code_93_reader",
        ], // List of active readers
      },
      locate: true, // try to locate the barcode in the image
      src: imageData, // or 'data:image/jpg;base64,' + data
    },
    function (result) {
      if (result && result.codeResult) {
        console.log("result", result.codeResult.code);
        // clearInterval(timer);
        successHandler(result.codeResult.code);
      } else {
        console.log("not detected");
        // clearInterval(timer);
        processInBackend(imageData);
      }
    }
  );
}

function successHandler(code) {
  confirmation = confirm(
    `Barcode detected ${code}, press "Cancel" if you want to proceed with it or press "OK" to scan again.`
  );
  if (confirmation == true) {
    // createInterval();
    cameraTrigger.click();
  } else {
    parentWindowEvent &&
      parentWindowEvent.source &&
      parentWindowEvent.source.postMessage(code, parentWindowEvent.origin);
    window.close();
  }
}

function errorHandler() {
  confirmation = confirm(`No barcode detected, press "OK" to scan again.`);
  if (confirmation == true) {
    // createInterval();
    cameraTrigger.click();
  } else {
    window.close();
  }
}

function getDevices() {
  // AFAICT in Safari this only gets default devices until gUM is called :/
  return navigator.mediaDevices.enumerateDevices();
}

function processInBackend(imageData) {
  var formData = new FormData();
  formData.append("imageData", imageData);
  window.axios
    .post("YOUR_BACKEND_API_ENDPOINT", formData)
    .then((res) => {
      if (res.data.code) {
        successHandler(res.data.code);
      } else {
        errorHandler();
      }
    })
    .catch((err) => {
      errorHandler();
    });
}

function gotDevices(deviceInfos) {
  window.deviceInfos = deviceInfos; // make available to console
  console.log("Available input and output devices:", deviceInfos);
  for (const deviceInfo of deviceInfos) {
    const option = document.createElement("option");
    option.value = deviceInfo.deviceId;
    if (deviceInfo.kind === "videoinput") {
      option.text = deviceInfo.label || `Camera ${videoSelect.length + 1}`;
      videoSelect.appendChild(option);
    }
  }
}

function getStream() {
  if (window.stream) {
    window.stream.getTracks().forEach((track) => {
      track.stop();
    });
  }
  const videoSource = videoSelect.value;
  const constraints = {
    video: { deviceId: videoSource ? { exact: videoSource } : undefined },
  };
  return navigator.mediaDevices
    .getUserMedia(constraints)
    .then(gotStream)
    .catch(handleError);
}

function gotStream(stream) {
  window.stream = stream; // make stream available to console
  videoSelect.selectedIndex = [...videoSelect.options].findIndex(
    (option) => option.text === stream.getVideoTracks()[0].label
  );
  videoElement.srcObject = stream;
}

function handleError(error) {
  console.error("Error: ", error);
}

function createInterval() {
  timer = setInterval(() => {
    cameraTrigger.click();
  }, 1000);
}

function closeWindow() {
  window.close();
}
