cmake_minimum_required(VERSION 3.10)

project(example)

# 添加编译定义（仅生产模式需要）
if(DEFINED ENV{BUILD_PACKED_FS})
    add_definitions(-DMG_ENABLE_PACKED_FS=1)
    add_definitions(-DBUILD_PACKED_FS=1)
    add_definitions(-DWEBSERVER_ROOT="/web_root")
    add_definitions(-DWEBSERVER_PAGE404="/web_root/index.html")
    set(MG_ENABLE_PACKED_FS 1)
endif()

set(EXEC_PATH ${CMAKE_CURRENT_BINARY_DIR}/bin)

set(EXECUTABLE_OUTPUT_PATH ${EXEC_PATH})

# 添加子目录
add_subdirectory(webserver)

# 创建可执行文件，使用收集的源文件
add_executable(demo ${ALL_SOURCES})

# 添加头文件路径
target_include_directories(demo PRIVATE ${ALL_INCLUDE_DIRS})

if(WIN32)
    target_link_libraries(demo ws2_32 advapi32)
endif()
