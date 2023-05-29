import React, { useRef, useState } from 'react';
import './App.css';

const Avrgirl = window.require('avrgirl-arduino');
const { SerialPort } = window.require('serialport');

function App() {
  const fileInput = useRef(null);
  const [fileName, updateFileName] = useState("");
  const [filePath, updateFilePath] = useState("");
  const [uploading, updateUploading] = useState(false);
  const [errorMessage, updateErrorMessage] = useState(false);
  const [doneUploading, updateDoneUploading] = useState(false);

  // Find the port for Arduino Pro Micro to trigger reset
  async function findResetPort() {
    let resetPort;
    Avrgirl.list((err, ports) => {
      resetPort = ports.find((port) => {
        return port.vendorId === '1d50';
      });
    });
    await new Promise((resolve) => setTimeout(resolve, 2000));
    if (!resetPort) {
      throw new Error('Arduino Pro Micro reset port not found');
    }
    return resetPort.path;
  }

  // Find the port for Arduino to upload hex file
  async function findUploadPort() {
    await new Promise((resolve) => setTimeout(resolve, 2000));

    let uploadPort;
    Avrgirl.list((err, ports) => {
      uploadPort = ports.find((port) => {
        return (port.vendorId === '1d50' && port.productId === '614f') ||
          (port.vendorId === '2341' && port.productId === '0036') ||
          port.vendorId === '2341';
      });
    });
    await new Promise((resolve) => setTimeout(resolve, 2000));

    if (uploadPort.length === 0) {
      throw new Error('Arduino upload port not found');
    }
    return uploadPort.path;
  }

  const handleUpload = async () => {
    const resetPort = await findResetPort();
    console.log(resetPort);
    // Trigger reset on Arduino Pro Micro
    const arduinoResetPort = new SerialPort({ path: resetPort, baudRate: 1200 });
    arduinoResetPort.on('open', () => {
      arduinoResetPort.close(async () => {
        const uploadPort = await findUploadPort();
        const avrgirl = new Avrgirl({
          board: 'micro',
          port: uploadPort,
          manualReset: true
        });
        // const filePath = `${__dirname}/hexs/${selectedFile}`
        avrgirl.flash(filePath, (error) => {
          if (error) {
            console.error(error);
          } else {
            console.log('Upload complete');
          }
        });
      });
    });
  }

  const handleSubmit = async (e) => {
    updateUploading(true);
    updateErrorMessage(false);
    updateDoneUploading(false);

    await handleUpload().then((error) => {
      if (error) {
        console.error(error);
        updateErrorMessage(true);
      } else {
        updateDoneUploading(true);
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
        <div>Failed.</div>
      }

      {doneUploading &&
        <div>Done. Restarting the device.</div>
      }
    </div>
  );
}

export default App;
