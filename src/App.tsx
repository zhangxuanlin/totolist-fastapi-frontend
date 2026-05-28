import React, { useState, useEffect, useRef } from 'react';
import { 
  Table, 
  Button, 
  Input, 
  Select, 
  Space, 
  Tag, 
  Modal, 
  Form, 
  Upload, 
  message,
  Avatar,
  Popconfirm
} from 'antd';
import { 
  PlusOutlined, 
  SearchOutlined, 
  DeleteOutlined, 
  EditOutlined, 
  ExclamationCircleFilled,
  UploadOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { getUserList, registerUser, editUser, deleteUser, batchDeleteUsers } from './api/user';

const { confirm } = Modal;

// 定义用户数据结构
interface UserItem {
  id: string;
  username: string;
  password: string;
  nickname: string;
  avatar: string;
  role: string;
  status: 1 | 0;
  created_at: string;
  updated_at: string;
}

export default function UserList() {
  // --- 状态管理 ---
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // 查询条件状态
  const [searchParams, setSearchParams] = useState({
    username: '',
    nickname: '',
    status: undefined,
    role: undefined,
    page: 1,
    page_size: 10,
  });

  // 用户列表数据
  const [dataSource, setDataSource] = useState<UserItem[]>([]);
  const [total, setTotal] = useState(0);

  // 获取用户列表
  const fetchUserList = async (params?: typeof searchParams) => {
    setLoading(true);
    try {
      const queryParams = params || searchParams;
      const result = await getUserList({
        page: queryParams.page,
        page_size: queryParams.page_size,
        username: queryParams.username !== '' ? queryParams.username : undefined,
        nickname: queryParams.nickname !== '' ? queryParams.nickname : undefined,
        status: queryParams.status !== '' ? queryParams.status : undefined,
        role: queryParams.role !== '' ? queryParams.role : undefined,
      });
      console.log(result);
      setTotal(result.total || 0);
      setDataSource(result.data || []);
    } catch (error) {
      console.error('获取用户列表失败:', error);
      message.error('获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 分页变更处理
  const handlePageChange = (page: number, pageSize: number) => {
    setSearchParams(prev => ({
      ...prev,
      page,
      page_size: pageSize,
    }));
    fetchUserList({
      ...searchParams,
      page,
      page_size: pageSize,
    });
  };

  // 初始化加载数据
  useEffect(() => {
    fetchUserList();
  }, []);

  // 查询按钮点击
  const handleSearch = () => {
    fetchUserList();
  };

  // 重置查询条件
  const resetSearch = () => {
    setSearchParams({
      username: '',
      nickname: '',
      status: undefined,
      role: undefined,
      page: 1,
      page_size: 10,
    });
    fetchUserList({
      username: '',
      nickname: '',
      status: undefined,
      role: undefined,
      page: 1,
      page_size: 10,
    });
  };

  // --- 操作流逻辑 ---

  // 头像URL处理：如果是完整URL直接使用，否则拼接基础路径
  const getAvatarUrl = (avatar: string | undefined): string | undefined => {
    if (!avatar) return undefined;
    if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
      return avatar;
    }
    return `http://127.0.0.1:8000/uploads/${avatar}`;
  };

  // 弹出新增/修改弹窗
  const showModal = (record?: UserItem) => {
    if (record) {
      setEditingUser(record);
      form.setFieldsValue({
        username: record.username,
        password: record.password,
        nickname: record.nickname,
        role: record.role,
        status: record.status,
      });
      // 编辑时显示现有头像（跟列表同样的URL处理逻辑）
      const avatarUrl = getAvatarUrl(record.avatar);
      setAvatarFileList(avatarUrl ? [{ uid: '-1', name: 'avatar.png', status: 'done', url: avatarUrl }] : []);
      avatarFileRef.current = null; // 不预填文件对象，只有上传新文件时才设置
    } else {
      setEditingUser(null);
      form.resetFields();
      avatarFileRef.current = null;
      setAvatarFileList([]);
    }
    setIsModalOpen(true);
  };

  // 存储原始文件对象，用于接口提交
  const avatarFileRef = useRef<File | null>(null);
  
  // 上传组件的 fileList 独立管理
  const [avatarFileList, setAvatarFileList] = useState<any[]>([]);

  // 处理头像上传
  const handleAvatarChange = (info: any) => {
    const file = info.file;
    if (file && file.status !== 'removed') {
      // Ant Design 5.x 中 info.file 本身就是完整的文件对象
      avatarFileRef.current = file;
      // 异步读取预览图
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarFileList([{ uid: file.uid, name: file.name, status: 'done', url: e.target?.result }]);
      };
      reader.readAsDataURL(file);
    } else if (file?.status === 'removed') {
      avatarFileRef.current = null;
      setAvatarFileList([]);
    }
  };

  // 提交新增/修改
  const handleFormSubmit = async () => {
    try {
      const values = await form.validateFields();
      const avatarOriginFile = avatarFileRef.current;
      console.log('提交时avatarOriginFile:', avatarOriginFile);
      
      if (editingUser) {
        // 修改分支：触发二次确认
        confirm({
          title: '确认保存修改吗？',
          icon: <ExclamationCircleFilled />,
          content: '此操作将覆盖该用户的原有信息。',
          okText: '确认',
          cancelText: '取消',
          onOk: async () => {
            try {
              // 如果上传了新头像，传新文件；没上传则传原头像文件名让后端保持
              let avatarToSend;
              if (avatarOriginFile) {
                avatarToSend = avatarOriginFile; // 新上传的文件
              } else if (avatarFileList.length > 0) {
                // 提取文件名（去掉 URL 前缀）
                const url = avatarFileList[0].url;
                avatarToSend = url.split('/').pop(); // 取最后一段作为文件名
              } else {
                avatarToSend = undefined; // 用户删除了头像
              }
              await editUser({
                id: editingUser.id,
                nickname: values.nickname,
                avatar: avatarToSend,
                role: values.role,
                status: values.status,
                password: values.password || undefined,
              });
              message.success('修改成功');
              fetchUserList();
              setIsModalOpen(false);
            } catch (error) {
              console.error('修改失败:', error);
            }
          },
        });
      } else {
        // 新增分支：调用注册接口
        try {
          await registerUser({
            username: values.username,
            password: values.password,
            nickname: values.nickname,
            avatar: avatarOriginFile || undefined,
            role: values.role,
            status: values.status,
          });
          message.success('新增成功');
          fetchUserList();
          avatarFileRef.current = null;
          setIsModalOpen(false);
        } catch (error) {
          console.error('注册失败:', error);
        }
      }
    } catch (error) {
      console.log('表单校验失败:', error);
    }
  };

  // 单个删除
  const handleDelete = (id: string) => {
    confirm({
      title: '确定要删除该用户吗？',
      icon: <ExclamationCircleFilled />,
      content: '删除后数据将无法恢复，请谨慎操作。',
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      async onOk() {
        try {
          await deleteUser(id);
          message.success('删除成功');
          fetchUserList();
        } catch (error) {
          console.error('删除失败:', error);
        }
      },
    });
  };

  // 批量删除
  const handleBatchDelete = () => {
    confirm({
      title: `确定要删除选中的 ${selectedRowKeys.length} 位用户吗？`,
      icon: <ExclamationCircleFilled />,
      content: '删除后数据将无法恢复，请谨慎操作。',
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      async onOk() {
        try {
          await batchDeleteUsers(selectedRowKeys as string[]);
          message.success('批量删除成功');
          setSelectedRowKeys([]);
          fetchUserList();
        } catch (error) {
          console.error('批量删除失败:', error);
        }
      },
    });
  };

  // --- Table 列配置 ---
  const columns: ColumnsType<UserItem> = [
    {
      title: '头像',
      dataIndex: 'avatar',
      key: 'avatar',
      width: 80,
      align: 'center',
      render: (avatar) => {
        return <Avatar src={getAvatarUrl(avatar)} icon={<UserOutlined />} size={40} />;
      },
    },
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: '密码',
      dataIndex: 'password',
      key: 'password',
    },
    {
      title: '昵称',
      dataIndex: 'nickname',
      key: 'nickname',
    },
    {
      title: '角色',
      dataIndex: 'role_name',
      key: 'role_name',
      width: 100,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => (
        <Tag color={status === 1 ? 'green' : 'red'}>
          {status === 1 ? '正常' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 180,
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      align: 'right',
      render: (_, record) => (
        <Space size="middle">
          <Button 
            type="text" 
            size="small" 
            icon={<EditOutlined />} 
            onClick={() => showModal(record)}
          >
            修改
          </Button>
          <Popconfirm
            title="确定要删除该用户吗？"
            description="删除后无法恢复该条数据。"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // UserOutlined 图标组件
  const UserOutlined = () => (
    <svg width="1em" height="1em" fill="currentColor" viewBox="0 0 1024 1024">
      <path d="M512 512c-110.5 0-200-89.5-200-200s89.5-200 200-200 200 89.5 200 200-89.5 200-200 200zm0-300c-55.2 0-100 44.8-100 100s44.8 100 100 100 100-44.8 100-100-44.8-100-100-100z" />
      <path d="M512 662c-176.7 0-320 143.3-320 320v62h640v-62c0-176.7-143.3-320-320-320zm0 550c-127.1 0-230-102.9-230-230s102.9-230 230-230 230 102.9 230 230-102.9 230-230 230z" />
    </svg>
  );

  return (
    <div style={{ padding: 20 }}>
      
      {/* 标题区 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>用户管理</h2>
          <p style={{ color: '#666', margin: '4px 0 0 0', fontSize: 14 }}>基于 Ant Design 构建的用户管理系统。</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => showModal()}>
          新增用户
        </Button>
      </div>

      {/* 搜索与工具栏 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <Space size="middle" wrap>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 50, textAlign: 'right' }}>用户名</span>
            <Input 
              placeholder="请输入用户名" 
              value={searchParams.username}
              onChange={(e) => setSearchParams(prev => ({ ...prev, username: e.target.value }))}
              style={{ width: 160 }}
              allowClear
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 50, textAlign: 'right' }}>昵称</span>
            <Input 
              placeholder="请输入昵称" 
              value={searchParams.nickname}
              onChange={(e) => setSearchParams(prev => ({ ...prev, nickname: e.target.value }))}
              style={{ width: 160 }}
              allowClear
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 50, textAlign: 'right' }}>状态</span>
            <Select 
              placeholder="请选择状态" 
              value={searchParams.status}
              onChange={(value) => setSearchParams(prev => ({ ...prev, status: value || undefined }))}
              style={{ width: 120 }}
              allowClear
            >
              <Select.Option value={1}>正常</Select.Option>
              <Select.Option value={0}>禁用</Select.Option>
            </Select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 50, textAlign: 'right' }}>角色</span>
            <Select 
              placeholder="请选择角色" 
              value={searchParams.role}
              onChange={(value) => setSearchParams(prev => ({ ...prev, role: value || undefined }))}
              style={{ width: 120 }}
              allowClear
            >
              <Select.Option value="admin">管理员</Select.Option>
              <Select.Option value="user">普通用户</Select.Option>
            </Select>
          </div>
          <Button 
            type="primary" 
            icon={<SearchOutlined />} 
            onClick={handleSearch}
            loading={loading}
          >
            查询
          </Button>
          <Button 
            icon={<ReloadOutlined />}
            onClick={resetSearch}
          >
            重置
          </Button>
        </Space>

        {/* 批量删除按钮（只有选中项时才展示） */}
        {selectedRowKeys.length > 0 && (
          <Button 
            type="primary" 
            danger 
            icon={<DeleteOutlined />} 
            onClick={handleBatchDelete}
          >
            批量删除 ({selectedRowKeys.length})
          </Button>
        )}
      </div>

      {/* 核心表格（集成了分页和多选功能） */}
      <Table 
        rowKey="id"
        columns={columns} 
        dataSource={dataSource}
        loading={loading}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys),
        }}
        pagination={{
          total: total,
          current: searchParams.page,
          pageSize: searchParams.page_size,
          showSizeChanger: true,
          pageSizeOptions: ['5', '10', '20'],
          showTotal: (total) => `共 ${total} 条数据`,
          onChange: handlePageChange,
        }}
      />

      {/* 新增/修改表单弹窗 */}
      <Modal
        title={editingUser ? "修改用户信息" : "创建新用户"}
        open={isModalOpen}
        onOk={handleFormSubmit}
        onCancel={() => setIsModalOpen(false)}
        okText={editingUser ? "保存修改" : "立即创建"}
        cancelText="取消"
        destroyOnClose
        width={600}
      >
        <Form 
          form={form} 
          layout="vertical" 
          style={{ marginTop: 20 }}
        >
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <Form.Item
                name="username"
                label="用户名"
                rules={[{ required: true, message: '请输入用户名！' }]}
              >
                <Input placeholder="请输入用户名" disabled={!!editingUser} />
              </Form.Item>
            </div>
            <div style={{ flex: 1 }}>
              <Form.Item
                name="password"
                label={editingUser ? "新密码（不填则保持原密码）" : "密码"}
                rules={!editingUser ? [{ required: true, message: '请输入密码！' }] : []}
              >
                <Input.Password placeholder={editingUser ? "请输入新密码（可选）" : "请输入密码"} />
              </Form.Item>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <Form.Item
                name="nickname"
                label="昵称"
                rules={[{ required: true, message: '请输入昵称！' }]}
              >
                <Input placeholder="请输入昵称" />
              </Form.Item>
            </div>
            <div style={{ flex: 1 }}>
              <Form.Item
                name="role"
                label="角色"
                rules={[{ required: true, message: '请选择角色！' }]}
              >
                <Select placeholder="请选择角色">
                  <Select.Option value="admin">管理员</Select.Option>
                  <Select.Option value="user">用户</Select.Option>
                </Select>
              </Form.Item>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <Form.Item
                name="avatar"
                label="头像"
              >
                <Upload
                  listType="picture-card"
                  fileList={avatarFileList}
                  onChange={handleAvatarChange}
                  beforeUpload={() => false}
                  maxCount={1}
                >
                  {avatarFileList.length ? null : (
                    <div>
                      <UploadOutlined />
                      <div style={{ marginTop: 8 }}>上传头像</div>
                    </div>
                  )}
                </Upload>
              </Form.Item>
            </div>
            <div style={{ flex: 1 }}>
              <Form.Item
                name="status"
                label="状态"
                rules={[{ required: true, message: '请选择状态！' }]}
              >
                <Select placeholder="请选择状态">
                  <Select.Option value={1}>正常</Select.Option>
                  <Select.Option value={0}>禁用</Select.Option>
                </Select>
              </Form.Item>
            </div>
          </div>
        </Form>
      </Modal>

    </div>
  );
}