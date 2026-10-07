package com.yisus.store_backend.user.service;

import com.yisus.store_backend.user.dto.ChangePasswordDTO;
import com.yisus.store_backend.user.dto.CreateUserDTO;
import com.yisus.store_backend.user.dto.UpdateProfileDTO;
import com.yisus.store_backend.user.dto.UpdateUserDTO;
import com.yisus.store_backend.user.dto.UserDTO;
import com.yisus.store_backend.user.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface UserService {

    public UserDTO getUserProfile(String email);

    public List<UserDTO> getAllUsers(String search);

    public UserDTO getUserById(Long id);

    public Page<UserDTO> getAllUsersPaginated(String search, Pageable pageable);

    public UserDTO createUser(CreateUserDTO userDTO);

    public UserDTO updateUser(Long id, UpdateUserDTO userDTO);

    public void deleteUser(Long id);

    public void updateUserStatus(Long id, Boolean isActive);

    public UserDTO mapToDTO(User user);

    public UserDTO updateProfile(Long userId, UpdateProfileDTO dto);

    public UserDTO uploadAvatar(Long userId, MultipartFile file);

    public UserDTO deleteAvatar(Long userId);

    public User changePassword(Long userId, ChangePasswordDTO dto);

    public void adminChangePassword(Long userId, String newPassword);
}
