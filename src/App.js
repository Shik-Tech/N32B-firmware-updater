import React, { useRef, useState } from 'react';
import './App.css';

const Avrgirl = window.require('avrgirl-arduino');

function App() {
  const fileInput = useRef(null);
  const [fileName, updateFileName] = useState("");
  const [filePath, updateFilePath] = useState("");
  const [uploading, updateUploading] = useState(false);
  const [errorMessage, updateErrorMessage] = useState(false);
  const [doneUploading, updateDoneUploading] = useState(false);

  const handleSubmit = async (e) => {
    updateUploading(true);
    updateErrorMessage(false);
    updateDoneUploading(false);

    // Avrgirl.list(function (err, ports) {
    //   console.log(ports);
    // });

    const avrgirl = new Avrgirl({
      board: {
        name: 'leonardo',
        baud: 57600,
        signature: Buffer.from([0x43, 0x41, 0x54, 0x45, 0x52, 0x49, 0x4e]),
        productId: ['0x0036', '0x0037', '0x8036', '0x800c', '0x614f'],
        productPage: 'https://store.arduino.cc/leonardo',
        protocol: 'avr109'
      },
    });

    avrgirl.flash(filePath, function (error) {
      if (error) {
        console.error(error);
        updateErrorMessage(true);
      } else {
        updateDoneUploading(true);
      }
      updateUploading(false);
    });
    Avrgirl.list(function (err, ports) {
      console.log(ports);
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
          <li>Click the update button</li>
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
        <button className="danger" type="button" onClick={handleSubmit} disabled={!fileName}>Update</button>
      </div>


      {uploading &&
        <div>Updating firmware...</div>
      }

      {errorMessage &&
        <div>Failed. Please make sure to double tap the reset button of the N32B device and wait 2 seconds before clicking the update button.</div>
      }

      {doneUploading &&
        <div>Done.</div>
      }
    </div>
  );
}

export default App;
