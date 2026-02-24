// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title SimpleNFT - Basic ERC-721 for Arc Network
/// @notice Deployed via `arc deploy nft <name> <symbol> <supply>`
/// @dev Minimal ERC-721 with on-chain metadata. Image stored as base64 data URI.
contract SimpleNFT {
    string public name;
    string public symbol;
    string private _imageURI;
    string private _description;
    uint256 public totalSupply;
    uint256 public maxSupply;
    address public owner;

    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => address) private _tokenApprovals;
    mapping(address => mapping(address => bool)) private _operatorApprovals;

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(
        string memory _name,
        string memory _symbol,
        string memory imageURI_,
        string memory description_,
        uint256 _maxSupply
    ) {
        name = _name;
        symbol = _symbol;
        _imageURI = imageURI_;
        _description = description_;
        maxSupply = _maxSupply;
        owner = msg.sender;
    }

    // ERC-165
    function supportsInterface(bytes4 interfaceId) public pure returns (bool) {
        return interfaceId == 0x80ac58cd  // ERC-721
            || interfaceId == 0x5b5e139f  // ERC-721 Metadata
            || interfaceId == 0x01ffc9a7; // ERC-165
    }

    function balanceOf(address addr) public view returns (uint256) {
        require(addr != address(0), "Zero address");
        return _balances[addr];
    }

    function ownerOf(uint256 tokenId) public view returns (address) {
        address tokenOwner = _owners[tokenId];
        require(tokenOwner != address(0), "Token does not exist");
        return tokenOwner;
    }

    function tokenURI(uint256 tokenId) public view returns (string memory) {
        require(_owners[tokenId] != address(0), "Token does not exist");
        return string(abi.encodePacked(
            "data:application/json;base64,",
            _base64Encode(abi.encodePacked(
                '{"name":"', name, ' #', _toString(tokenId),
                '","description":"', _description,
                '","image":"', _imageURI, '"}'
            ))
        ));
    }

    function approve(address to, uint256 tokenId) public {
        address tokenOwner = ownerOf(tokenId);
        require(msg.sender == tokenOwner || _operatorApprovals[tokenOwner][msg.sender], "Not authorized");
        _tokenApprovals[tokenId] = to;
        emit Approval(tokenOwner, to, tokenId);
    }

    function getApproved(uint256 tokenId) public view returns (address) {
        require(_owners[tokenId] != address(0), "Token does not exist");
        return _tokenApprovals[tokenId];
    }

    function setApprovalForAll(address operator, bool approved) public {
        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function isApprovedForAll(address addr, address operator) public view returns (bool) {
        return _operatorApprovals[addr][operator];
    }

    function transferFrom(address from, address to, uint256 tokenId) public {
        require(_isApprovedOrOwner(msg.sender, tokenId), "Not authorized");
        _transfer(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) public {
        transferFrom(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory) public {
        transferFrom(from, to, tokenId);
    }

    function mint(address to, uint256 quantity) external onlyOwner {
        require(totalSupply + quantity <= maxSupply, "Exceeds max supply");
        for (uint256 i = 0; i < quantity; i++) {
            uint256 tokenId = totalSupply + 1;
            _owners[tokenId] = to;
            _balances[to]++;
            totalSupply++;
            emit Transfer(address(0), to, tokenId);
        }
    }

    function _isApprovedOrOwner(address spender, uint256 tokenId) internal view returns (bool) {
        address tokenOwner = ownerOf(tokenId);
        return (spender == tokenOwner || _tokenApprovals[tokenId] == spender || _operatorApprovals[tokenOwner][spender]);
    }

    function _transfer(address from, address to, uint256 tokenId) internal {
        require(ownerOf(tokenId) == from, "Not token owner");
        require(to != address(0), "Zero address");
        delete _tokenApprovals[tokenId];
        _balances[from]--;
        _balances[to]++;
        _owners[tokenId] = to;
        emit Transfer(from, to, tokenId);
    }

    // Base64 encoding
    function _base64Encode(bytes memory data) internal pure returns (string memory) {
        bytes memory TABLE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        uint256 len = data.length;
        if (len == 0) return "";
        uint256 encodedLen = 4 * ((len + 2) / 3);
        bytes memory result = new bytes(encodedLen);
        uint256 j = 0;
        for (uint256 i = 0; i < len; i += 3) {
            uint256 a = uint8(data[i]);
            uint256 b = i + 1 < len ? uint8(data[i + 1]) : 0;
            uint256 c = i + 2 < len ? uint8(data[i + 2]) : 0;
            result[j++] = TABLE[(a >> 2) & 0x3F];
            result[j++] = TABLE[((a & 0x3) << 4) | ((b >> 4) & 0xF)];
            result[j++] = i + 1 < len ? TABLE[((b & 0xF) << 2) | ((c >> 6) & 0x3)] : bytes1("=");
            result[j++] = i + 2 < len ? TABLE[c & 0x3F] : bytes1("=");
        }
        return string(result);
    }

    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) { digits++; temp /= 10; }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits--;
            buffer[digits] = bytes1(uint8(48 + value % 10));
            value /= 10;
        }
        return string(buffer);
    }
}
