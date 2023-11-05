import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ReactWidget } from '@jupyterlab/ui-components';
import ContractVisualization from './contract-visualization';
import { Dayjs } from 'dayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import FileSelect from "./select-wrapper";
import {Select, MenuItem, FormControl, InputLabel, Box, SelectChangeEvent } from "@mui/material";



interface Contract {
  _id: string;
  name: string;
  group: string;
  childContractAddress: string;
  policyId: {
  assetId: {
      fileName: string;
      fileType: string;
    }
  }
};

interface ContractDetails {
  groupName: string;
  permissions: string;
  accessFrom: number;
  accessTo: number;
  countries: string[];
  organizations: string[];
  contractAddress: string;
}

interface userDetailsToContractMap {
  eoaAddress: string;
  accessFrom: string;
  accessTo: string;
}

interface SaveUserToContractMap {
    contractAddress: string;
    usersListToAdd: userDetailsToContractMap[];
    groupName: string;
}

interface FileOption {
  id: string;
  name: string;
  IPFSHash: string;
}

const ContractAssignmentComponent: React.FC = () => {
    const backendUrl = 'http://localhost:3000';
    const LS_KEY = 'login-with-metamask:auth';
    const ls = window.localStorage.getItem(LS_KEY);
    const auth = ls && JSON.parse(ls);
    const { accessToken } = auth;

    const [selectedContract, setSelectedContract] = useState<ContractDetails>();
    // const [myObject, setMyObject] = useState<{ [key: string]: any }>({});
    const [eoaAddress, setEoaAddress] = useState<string>(''); // State to store single EOA address
    const [usersListToSaveInContract, setUsersListDetailToSaveInContract] = useState<userDetailsToContractMap[]>([]); // State to store multiple EOA addresses
    const [accessFrom, setAccessFrom] = useState<Dayjs | null>(null);
    const [accessTo, setAccessTo] = useState<Dayjs | null>(null);
    const [contractInformation, setContractInformation] = useState<Contract[]>([]);
    const [selectedIPFSFiles, setSelectedIPFSFiles] = useState<FileOption[]>([]);
    const [userUploadedFiles, setUserUploadedFiles] = useState<FileOption[]>([]);


  const handleEoaAddressChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEoaAddress(event.target.value);
  };

  const handleIPFSFileSelection = (selectedFiles: FileOption[]) => {
    setSelectedIPFSFiles(selectedFiles);
  };

  const handleDateChange = (date: Dayjs | null, type: string) => {
    if (type === 'access_from') {
      setAccessFrom(date);
    } else {
      setAccessTo(date);
    }
  }

  //handle the addtion of multiple EOA addresses
  const handleAddUser = () => {
    const trimmedAddress = eoaAddress.trim();
    const addressAlreadyExists = usersListToSaveInContract.some(obj => obj.eoaAddress === trimmedAddress);
    if (trimmedAddress !== '' && !addressAlreadyExists) {
      setUsersListDetailToSaveInContract([...usersListToSaveInContract, {eoaAddress, accessFrom: accessFrom!.toISOString(), accessTo: accessTo!.toISOString()}]);
      setEoaAddress('');
      setAccessFrom(null);
      setAccessTo(null);
    }
    else{
      window.alert('The EOA address is empty or already exists in the list');
    }
    
  };

  const handleContractSelect = (event: SelectChangeEvent<string>) => {

    const selectedContract = event.target.value;
    axios
    .get(`${backendUrl}/api/v1/policies/get-contract-details?childContractAddress=${selectedContract}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    .then((response) => {
      console.log(response.data, 'response data of the selected contract')
      setSelectedContract(response.data);
    })
    .catch((error) => {
      console.error('Error fetching contract information:', error);
      window.alert('Error fetching contract information');
    });
    // const selected = contractInformation.find((contract) => contract.childContractAddress === selectedContract);
    // if (selected) {
    //   setSelectedContract(selected);
    // }
    // else{
    //   setSelectedContract(null);
    // }
  };

  const handleRemoveUser = (index: number) => {
    const updatedUserList = [...usersListToSaveInContract];
    updatedUserList.splice(index, 1);
    setUsersListDetailToSaveInContract(updatedUserList);
  };

  const loadUserUploadedFiles = async () => { 
    const { accessToken } = auth;
		axios(`${backendUrl}/api/v1/users/uploadedFiles`, {
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		})
			.then((response) => {
				const uploadedFiles = response.data
        let selectOptions = uploadedFiles.rows.map((file: any) => {
          return {id: file.id, name:file.metadata.name, IPFSHash: file.ipfs_pin_hash}
        })
        setUserUploadedFiles(selectOptions)
			})
			.catch(window.alert);
  };

  useEffect(() => {
		loadUserUploadedFiles()
	}, []);

  useEffect(() => {
   
    axios
      .get(`${backendUrl}/api/v1/transactions`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
      .then((response) => {
        console.log(response.data, 'response data check')
        setContractInformation(response.data);
      })
      .catch((error) => {
        console.error('Error fetching contract information:', error);
        window.alert('Error fetching contract information');
      });
  }, []);

  const handleSaveButton = async (event: React.FormEvent) => {
    

    event.preventDefault();
  
    const formData = new FormData();

    const user_contract_details: SaveUserToContractMap = {
      contractAddress: selectedContract!.contractAddress,
      usersListToAdd: usersListToSaveInContract,
      groupName: selectedContract!.groupName
    }

formData.append('user_contract_details', JSON.stringify(user_contract_details));
    // Sending a POST request to the backend server using Axios
      try {
        const response = await axios({
          method: "post",
          url: `${backendUrl}/api/v1/policies/add-users-to-group`,
          data: formData,
          headers: { 
            Authorization: `Bearer ${auth.accessToken}`
          },
        });
        // notify('Policy Saved Successfully and Sma');
        return response.data;
      } catch(error) {
        console.log(error)
      }  
  };

  

  return (
    <div style={{ marginBottom: '20px', padding: '20px', border: '1px solid #ccc', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
          <input
                type="text"
                id="eoaAddress"
                name="eoaAddress"
                placeholder="EOA Address of the user"
                value={eoaAddress}
                onChange={handleEoaAddressChange}
                style={{ flex: 1, padding: '10px',  marginRight: '10px', border: '1px solid #ccc', borderRadius: '5px' }}
              />
              <div style={{ flex: 1, marginRight: '10px' }}>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DatePicker
                    label="Access From"
                    value={accessFrom}
                    onChange={(date) => handleDateChange(date, 'access_from')}
                  />
                </LocalizationProvider>
              </div>
              <div style={{ flex: 1,  marginRight: '10px' }}>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DatePicker
                    label="Access To"
                    value={accessTo}
                    onChange={(date) => handleDateChange( date, 'access_to')}
                  />
                </LocalizationProvider>
              </div>

        <div style={{ flex: 1, marginRight: '10px' }}>
        <button onClick={handleAddUser}>Add User</button>
        </div>
      </div>
      {(usersListToSaveInContract.length > 0) && (
        <div>
          <h3>Selected Users:</h3>
          <ul>
            {usersListToSaveInContract.map((user, index) => (
              <li key={index}>
                {user.eoaAddress} AccessFrom: {user.accessFrom} - AccessTo: {user.accessTo} <button onClick={() => handleRemoveUser(index)}>Remove</button>
              </li>
            ))}
          </ul>
      </div>
      )}
      
      <div>
      <h2>Select Contract and Files To Share</h2>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>       
              <div style={{ flex: 1, marginRight: '10px' }}>
              <Box>
                <FormControl fullWidth>
                  <InputLabel>Select a Contract</InputLabel>
                  <Select
                      onChange={handleContractSelect} // Update the event type
                      label="Select a Contract"
                      placeholder="Select a Contract"
                    >
                    {contractInformation.map((contract) => (
                      <MenuItem key={contract.childContractAddress} value={contract.childContractAddress}>
                        {contract.group}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              </div>
              <div style={{ flex: 1 }}>
                <FileSelect
                  files={userUploadedFiles}
                  onSelect={handleIPFSFileSelection}
                />
              </div>
            </div>
            {(selectedIPFSFiles.length > 0 ) && (
              <div>
                <h2>Selected IPFS files:</h2>
                <ul>
                  {selectedIPFSFiles.map((file, index) => (
                    <li key={index}>
                      {file.name} - {file.IPFSHash}
                    </li>
                  ))}
                </ul>
            </div>
              )}
        <button onClick={handleSaveButton}>Save</button>
          {selectedContract &&(
            <ContractVisualization selectedContract={selectedContract} />  
          )}
    </div>

    </div>
  );
};

export class UserAssignWrapper extends ReactWidget {
  constructor() {
    super();
    this.addClass('jp-react-widget');
  }

  render(): JSX.Element {
    return <ContractAssignmentComponent />;
  }
}
