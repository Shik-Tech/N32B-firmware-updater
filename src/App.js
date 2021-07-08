import React, { useRef, useState } from 'react';
import './App.css';

const Avrgirl = window.require('avrgirl-arduino');

function App() {
  const fileInput = useRef(null);
  const [fileName, updateFileName] = useState("");
  const [filePath, updateFilePath] = useState("");
  const [uploading, updateUploading] = useState(false);



  const handleSubmit = e => {
    updateUploading(true);
    
    Avrgirl.list(function (err, ports) {
      console.log(ports);
    });

    // To upload new sketch, tap twice on the reset button and click upload.
    const avrgirl = new Avrgirl({
      board: 'leonardo',
      // debug: true,
      manualReset: true
    });

    avrgirl.flash(filePath, function (error) {
      if (error) {
        console.error(error);
      } else {
        console.info('done.');
        Avrgirl.list(function (err, ports) {
          console.log(ports);
        });
      }
      updateUploading(false);
    });
  };

  return (
    <div className="App">
      <div>Load new firmware</div>

      <button
        type="button"
        aria-controls="fileInput"
        onClick={() => fileInput.current.click()}
      >Choose file</button>
      <input
        type="file"
        ref={fileInput}
        onChange={() => {
          if (fileInput.current.files.length > 0) {
            console.log(fileInput.current.files[0]);
            updateFileName(fileInput.current.files[0].name);
            updateFilePath(fileInput.current.files[0].path);
            Avrgirl.list(function (err, ports) {
              console.log(ports);
            });
          }
        }
        }
      />
      <span id="fileName">
        {fileName ? fileName : "No file chosen"}
      </span>

      <button type="button" onClick={handleSubmit} disabled={!fileName}>Update</button>

      {uploading &&
        <div>Uploading</div>
      }
    </div>
  );
}

export default App;
