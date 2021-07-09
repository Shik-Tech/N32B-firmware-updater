import React, { useRef, useState } from 'react';
import './App.css';

const Avrgirl = window.require('avrgirl-arduino');

function App() {
  const fileInput = useRef(null);
  const [fileName, updateFileName] = useState("");
  const [filePath, updateFilePath] = useState("");
  const [uploading, updateUploading] = useState(false);
  const [errorMessage, updateErrorMessage] = useState(false);


  const handleSubmit = e => {
    updateUploading(true);
    updateErrorMessage(false);

    Avrgirl.list(function (err, ports) {
      console.log(ports);
    });

    // To upload new sketch, tap twice on the reset button, wait 2 seconds and click upload.
    const avrgirl = new Avrgirl({
      board: 'leonardo',
      manualReset: true
    });

    avrgirl.flash(filePath, function (error) {
      if (error) {
        console.error(error);
        updateErrorMessage(true);
      } else {
        console.info('done.');
      }
      updateUploading(false);
    });
  };

  return (
    <div className="App column">
      <h1>N32B Firmware updater</h1>
      <div className="row">
        <ol>
          <li>Choose the new firmware file.</li>
          <li>Double tap the reset button on the N32B device.</li>
          <li>Wait 2 seconds.</li>
          <li>Click the upload button</li>
        </ol>
      </div>

      <div className="row">
        <button
          type="button"
          aria-controls="fileInput"
          onClick={() => fileInput.current.click()}
        >Choose firmware file</button>
        <span id="fileName">
          {fileName ? fileName : ''}
        </span>
        <input
          type="file"
          accept=".hex"
          ref={fileInput}
          onChange={() => {
            if (fileInput.current.files.length > 0) {
              updateFileName(fileInput.current.files[0].name);
              updateFilePath(fileInput.current.files[0].path);
            }
          }
          }
        />
      </div>

      <div className="row">
        <button className="danger" type="button" onClick={handleSubmit} disabled={!fileName}>Update the device</button>
      </div>


      {uploading &&
        <div>Uploading...</div>
      }

      {errorMessage &&
        <div>Failed. Please make sure to double tap the reset button of the N32B device and wait 2 seconds before clicking the update button.</div>
      }
    </div>
  );
}

export default App;
