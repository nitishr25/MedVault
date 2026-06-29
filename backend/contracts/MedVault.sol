// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MedVault {
    
    enum Role { Patient, Doctor, HospitalAdmin }

    struct MedicalRecord {
        uint256 id;
        string ipfsHash;
        string title;
        uint256 timestamp;
        bool isDeleted; // 🗑️ Track soft-deletion state for storage compliance
    }

    // =========================================================================
    // 💾 STATE STORAGE LATTICE
    // =========================================================================
    address public systemOwner;
    mapping(address => Role) public userRoles;
    mapping(address => bool) public isRegistered;
    
    // Core Medical Document Collections: Patient Address => Records Array
    mapping(address => MedicalRecord[]) private patientRecords;
    
    // Access Control List (ACL): Patient => Doctor => Has Access
    mapping(address => mapping(address => bool)) private accessRegistry;
    
    // Transparent Identity Index Tracking: Patient => List of Active Authorized Doctor Addresses
    mapping(address => address[]) private authorizedDoctorsList;
    mapping(address => mapping(address => uint256)) private doctorListIndex; // Optimization map for fast removals

    uint256 private recordCounter;

    // =========================================================================
    // 🔔 ARCHITECTURAL TRANSACTIONS EVENTS
    // =========================================================================
    event RoleRegistered(address indexed user, Role role);
    event PractitionerVerified(address indexed doctor, address indexed verifier);
    event RecordAdded(address indexed patient, uint256 recordId, string ipfsHash);
    event RecordDeleted(address indexed patient, uint256 recordId);
    event AccessGranted(address indexed patient, address indexed doctor);
    event AccessRevoked(address indexed patient, address indexed doctor);

    // =========================================================================
    // 🛡️ CRYPTOGRAPHIC ACCESS CONTROL MODIFIERS
    // =========================================================================
    modifier onlyRole(Role _role) {
        require(isRegistered[msg.sender] && userRoles[msg.sender] == _role, "Web3 Auth: Access denied. Role mismatch.");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == systemOwner, "Web3 Auth: Root initialization mandate violation.");
        _;
    }

    constructor() {
        systemOwner = msg.sender;
        // Seed the original deploying wallet cleanly as a verified Administrator
        userRoles[msg.sender] = Role.HospitalAdmin;
        isRegistered[msg.sender] = true;
        emit RoleRegistered(msg.sender, Role.HospitalAdmin);
    }

    // =========================================================================
    // ✍️ WRITE TRANSACTIONS (Mutating Ledger Realities)
    // =========================================================================

    // Self-registration portal for everyday application endpoints
    function registerRole(Role _role) external {
        require(!isRegistered[msg.sender], "Security Gate: Identity address signature already bound to roles ledger.");
        
        if (_role == Role.Patient) {
            userRoles[msg.sender] = Role.Patient;
            isRegistered[msg.sender] = true;
            emit RoleRegistered(msg.sender, Role.Patient);
        } else {
            // Doctors and secondary Admin vectors sit in a pending state until certified by an active Admin
            userRoles[msg.sender] = _role;
            isRegistered[msg.sender] = false; 
            emit RoleRegistered(msg.sender, _role);
        }
    }

    // ✅ FIXED ARCHITECTURAL LINK: Admin Provisioning Portal
    // This allows your automated seed deployment environment to register the server backend wallet 
    // cleanly from Account #0 without altering production security boundaries.
    function registerUser(address _userAddress, Role _role) external onlyRole(Role.HospitalAdmin) {
        require(!isRegistered[_userAddress], "Governance Node: This user profile signature is already active.");
        
        userRoles[_userAddress] = _role;
        isRegistered[_userAddress] = true;
        
        emit RoleRegistered(_userAddress, _role);
        if (_role == Role.Doctor) {
            emit PractitionerVerified(_userAddress, msg.sender);
        }
    }

    // Hospital Admin Governance Action: Activates doctor registration credentials securely
    function verifyPractitioner(address _pendingDoctor) external onlyRole(Role.HospitalAdmin) {
        require(userRoles[_pendingDoctor] == Role.Doctor, "Governance Node: Target identity must map to a Doctor template.");
        require(!isRegistered[_pendingDoctor], "Governance Node: Target identity is already fully authorized across endpoints.");
        
        isRegistered[_pendingDoctor] = true;
        emit PractitionerVerified(_pendingDoctor, msg.sender);
    }

    // Patients write files to their on-chain identity array
    function addMedicalRecord(string calldata _ipfsHash, string calldata _title) external onlyRole(Role.Patient) {
        recordCounter++;
        patientRecords[msg.sender].push(MedicalRecord({
            id: recordCounter,
            ipfsHash: _ipfsHash,
            title: _title,
            timestamp: block.timestamp,
            isDeleted: false
        }));
        
        emit RecordAdded(msg.sender, recordCounter, _ipfsHash);
    }

    // Cryptographic Record Index Erasure Routine
    function deleteRecord(uint256 _recordId) external onlyRole(Role.Patient) {
        uint256 totalCount = patientRecords[msg.sender].length;
        bool matchingIndexFound = false;

        for (uint256 i = 0; i < totalCount; i++) {
            if (patientRecords[msg.sender][i].id == _recordId && !patientRecords[msg.sender][i].isDeleted) {
                patientRecords[msg.sender][i].isDeleted = true; // Soft delete ensures gas limits remain steady
                matchingIndexFound = true;
                emit RecordDeleted(msg.sender, _recordId);
                break;
            }
        }
        require(matchingIndexFound, "Ledger Engine Failure: Target record ID does not match active entries.");
    }

    // Patients grant explicit permission to a verified doctor wallet address
    function grantAccessToDoctor(address _doctor) external onlyRole(Role.Patient) {
        require(isRegistered[_doctor] && userRoles[_doctor] == Role.Doctor, "ACL Guard: Target wallet is not an active verified Doctor node.");
        require(!accessRegistry[msg.sender][_doctor], "ACL Guard: Access credentials already live on registry.");

        accessRegistry[msg.sender][_doctor] = true;
        
        // Push to ownership monitoring index trackers
        doctorListIndex[msg.sender][_doctor] = authorizedDoctorsList[msg.sender].length;
        authorizedDoctorsList[msg.sender].push(_doctor);
        
        emit AccessGranted(msg.sender, _doctor);
    }

    // Patients instantly cut off access permissions
    function revokeAccessFromDoctor(address _doctor) external onlyRole(Role.Patient) {
        require(accessRegistry[msg.sender][_doctor], "ACL Guard: Target identity holds no active permissions clearance.");

        accessRegistry[msg.sender][_doctor] = false;

        // Clean removal from array structure to protect patient data tracking transparency
        uint256 targetIndex = doctorListIndex[msg.sender][_doctor];
        uint256 lastElementIndex = authorizedDoctorsList[msg.sender].length - 1;

        if (targetIndex != lastElementIndex) {
            address lastDoctor = authorizedDoctorsList[msg.sender][lastElementIndex];
            authorizedDoctorsList[msg.sender][targetIndex] = lastDoctor;
            doctorListIndex[msg.sender][lastDoctor] = targetIndex;
        }
        authorizedDoctorsList[msg.sender].pop();
        delete doctorListIndex[msg.sender][_doctor];

        emit AccessRevoked(msg.sender, _doctor);
    }

    // =========================================================================
    // 🔍 VIEW TRANSACTIONS (Read-Only Operations)
    // =========================================================================

    // Fetch active non-deleted patient files
    function getMyRecords() external view onlyRole(Role.Patient) returns (MedicalRecord[] memory) {
        uint256 total = patientRecords[msg.sender].length;
        uint256 nonDeletedCount = 0;

        for (uint256 i = 0; i < total; i++) {
            if (!patientRecords[msg.sender][i].isDeleted) nonDeletedCount++;
        }

        MedicalRecord[] memory filteredList = new MedicalRecord[](nonDeletedCount);
        uint256 currentIndex = 0;
        for (uint256 i = 0; i < total; i++) {
            if (!patientRecords[msg.sender][i].isDeleted) {
                filteredList[currentIndex] = patientRecords[msg.sender][i];
                currentIndex++;
            }
        }
        return filteredList;
    }

    // Verified Doctor index retrieval block with on-chain authorization confirmation firewall
    function getPatientRecordsAsDoctor(address _patientAddress) external view onlyRole(Role.Doctor) returns (MedicalRecord[] memory) {
        require(accessRegistry[_patientAddress][msg.sender] == true, "Web3 Firewall: Patient has not authorized this node connection.");
        
        uint256 total = patientRecords[_patientAddress].length;
        uint256 nonDeletedCount = 0;

        for (uint256 i = 0; i < total; i++) {
            if (!patientRecords[_patientAddress][i].isDeleted) nonDeletedCount++;
        }

        MedicalRecord[] memory filteredList = new MedicalRecord[](nonDeletedCount);
        uint256 currentIndex = 0;
        for (uint256 i = 0; i < total; i++) {
            if (!patientRecords[_patientAddress][i].isDeleted) {
                filteredList[currentIndex] = patientRecords[_patientAddress][i];
                currentIndex++;
            }
        }
        return filteredList;
    }

    // Output data registry arrays so patients track exactly who holds clear view rights
    function getMyAuthorizedDoctors() external view onlyRole(Role.Patient) returns (address[] memory) {
        return authorizedDoctorsList[msg.sender];
    }

    // Access authorization helper check
    function checkAccessClearance(address _patient, address _doctor) external view returns (bool) {
        return accessRegistry[_patient][_doctor];
    }
}