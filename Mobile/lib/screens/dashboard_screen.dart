import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:animate_do/animate_do.dart';
import 'package:fl_chart/fl_chart.dart';
import '../theme/app_theme.dart';
import '../services/api_service.dart';
import '../providers/data_providers.dart';
import 'login_screen.dart';
import 'apps_screen.dart';

class DashboardScreen extends ConsumerStatefulWidget {
  const DashboardScreen({super.key});

  @override
  ConsumerState<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends ConsumerState<DashboardScreen> {
  int _selectedIndex = 0;
  bool _isLoading = true;
  Map<String, dynamic>? _userData;
  List<dynamic> _notifications = [];

  // Helper to get fallback/saved info
  String get _userName => _userData?['name'] ?? _userData?['username'] ?? 'User';
  String get _userRole => _userData?['role'] ?? 'STAFF';
  String? get _userAvatar => _userData?['avatar'];

  @override
  void initState() {
    super.initState();
    _fetchUserData();
  }

  Future<void> _fetchUserData() async {
    setState(() => _isLoading = true);
    
    // First try to load saved user data immediately for better UX
    final savedUser = await ApiService.getSavedUser();
    if (savedUser != null && mounted) {
      setState(() {
        _userData = savedUser;
      });
    }

    try {
      final results = await Future.wait([
        ApiService.checkAuth(),
        ApiService.getNotifications(),
      ]);

      setState(() {
        final authData = results[0] as Map<String, dynamic>;
        if (authData['isLoggedIn'] == true) {
          _userData = authData;
        }
        
        _notifications = results[1] as List<dynamic>;
        _isLoading = false;
      });
    } catch (e) {
      debugPrint('Error fetching user data or notifications: $e');
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  void _handleLogout() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Logout'),
        content: const Text('Are you sure you want to log out?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Logout', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      await ApiService.logout();
      if (mounted) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (context) => const LoginScreen()),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final dashboardAsync = ref.watch(dashboardProvider);

    final List<Widget> screens = [
      dashboardAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(child: Text('Error: $err')),
        data: (stats) => RefreshIndicator(
          onRefresh: () async {
            await _fetchUserData();
            return ref.refresh(dashboardProvider.future);
          },
          child: _buildDashboardContent(stats ?? {}),
        ),
      ),
      const AppsScreen(),
      _buildPlaceholderScreen('Settings'),
    ];

    return Scaffold(
      body: IndexedStack(
        index: _selectedIndex,
        children: screens,
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 10,
              offset: const Offset(0, -5),
            ),
          ],
        ),
        child: BottomNavigationBar(
          currentIndex: _selectedIndex,
          onTap: (index) => setState(() => _selectedIndex = index),
          selectedItemColor: AppTheme.primary,
          unselectedItemColor: AppTheme.textLight,
          type: BottomNavigationBarType.fixed,
          backgroundColor: Colors.white,
          items: const [
            BottomNavigationBarItem(icon: Icon(Icons.dashboard_rounded), label: 'Dashboard'),
            BottomNavigationBarItem(icon: Icon(Icons.grid_view_rounded), label: 'Menu'),
            BottomNavigationBarItem(icon: Icon(Icons.settings_rounded), label: 'Settings'),
          ],
        ),
      ),
    );
  }

  Widget _buildPlaceholderScreen(String title) {
    return Scaffold(
      appBar: AppBar(title: Text(title), centerTitle: true),
      body: Center(child: Text('$title Screen Coming Soon')),
    );
  }

  Widget _buildDashboardContent(Map<String, dynamic> stats) {
    final unreadCount = _notifications.where((n) => n['is_read'] == false).length;
    final totalUsers = stats['totalUsers'] ?? 0;
    final totalAssets = stats['totalAssets'] ?? 0;
    final readyAssets = stats['readyAssets'] ?? 0;
    final brokenAssets = stats['brokenAssets'] ?? 0;

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'GOKSO Dashboard',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        actions: [
          IconButton(
            icon: Badge(
              label: Text(unreadCount.toString()),
              child: const Icon(Icons.notifications_outlined),
            ),
            onPressed: () {},
          ),
          const SizedBox(width: 8),
          GestureDetector(
            onTap: _handleLogout,
            child: CircleAvatar(
              radius: 18,
              backgroundColor: AppTheme.primary,
              backgroundImage: _userAvatar != null && _userAvatar!.toString().isNotEmpty
                  ? NetworkImage('${ApiService.baseUrl.replaceAll('/api', '')}/public/uploads/avatars/$_userAvatar')
                  : const NetworkImage('https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'),
            ),
          ),
          const SizedBox(width: 16),
        ],
      ),
      body: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            FadeInDown(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Welcome back, $_userName!',
                    style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                          color: AppTheme.textMain,
                          fontWeight: FontWeight.w800,
                        ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Role: ${_userRole.toUpperCase()}',
                    style: const TextStyle(color: AppTheme.textLight, fontWeight: FontWeight.bold, fontSize: 12),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 30),
            
            // Stats Grid
            Row(
              children: [
                Expanded(
                  child: FadeInLeft(
                    child: _buildStatCard(
                      'Users',
                      '$totalUsers',
                      Icons.people_alt_outlined,
                      const Color(0xFF1E59C5),
                      const Color(0xFF3B82F6),
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: FadeInRight(
                    child: _buildStatCard(
                      'Total Assets',
                      '$totalAssets',
                      Icons.assignment_outlined,
                      const Color(0xFF059669),
                      const Color(0xFF10B981),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: FadeInLeft(
                    delay: const Duration(milliseconds: 200),
                    child: _buildStatCard(
                      'Ready',
                      '$readyAssets',
                      Icons.check_circle_outline,
                      const Color(0xFFD97706),
                      const Color(0xFFFBBF24),
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: FadeInRight(
                    delay: const Duration(milliseconds: 200),
                    child: _buildStatCard(
                      'Broken',
                      '$brokenAssets',
                      Icons.error_outline,
                      const Color(0xFFDC2626),
                      const Color(0xFFEF4444),
                    ),
                  ),
                ),
              ],
            ),
            
            const SizedBox(height: 32),

            // Charts Selection
            FadeInUp(
              delay: const Duration(milliseconds: 300),
              child: _buildSectionHeader('Data Visualization'),
            ),
            const SizedBox(height: 16),
            
            // Pie Chart (Status)
            FadeInUp(
              delay: const Duration(milliseconds: 400),
              child: _buildChartContainer(
                'Asset Status Distribution',
                _buildPieChart(stats),
                _buildPieLegend(),
              ),
            ),
            
            const SizedBox(height: 20),

            // Bar Chart (Category)
            FadeInUp(
              delay: const Duration(milliseconds: 500),
              child: _buildChartContainer(
                'Category Distribution',
                SizedBox(
                  height: 200,
                  child: _buildBarChart(stats),
                ),
                const SizedBox.shrink(),
              ),
            ),
            
            const SizedBox(height: 32),
            
            FadeInUp(
              delay: const Duration(milliseconds: 600),
              child: _buildRecentActivity(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Text(
      title,
      style: const TextStyle(
        fontSize: 18,
        fontWeight: FontWeight.bold,
        color: AppTheme.textMain,
      ),
    );
  }

  Widget _buildChartContainer(String title, Widget chart, Widget footer) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
          ),
          const SizedBox(height: 24),
          chart,
          footer,
        ],
      ),
    );
  }

  Widget _buildPieChart(Map<String, dynamic> stats) {
    final ready = double.tryParse('${stats['readyAssets'] ?? 0}') ?? 0;
    final broken = double.tryParse('${stats['brokenAssets'] ?? 0}') ?? 0;
    final total = ready + broken;

    if (total == 0) {
      return const SizedBox(
        height: 150,
        child: Center(child: Text('No asset data available')),
      );
    }

    return SizedBox(
      height: 150,
      child: PieChart(
        PieChartData(
          sectionsSpace: 4,
          centerSpaceRadius: 40,
          sections: [
            PieChartSectionData(
              color: const Color(0xFF10B981),
              value: ready,
              title: '${(ready / total * 100).toStringAsFixed(0)}%',
              radius: 40,
              titleStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
            ),
            PieChartSectionData(
              color: const Color(0xFFEF4444),
              value: broken,
              title: '${(broken / total * 100).toStringAsFixed(0)}%',
              radius: 40,
              titleStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPieLegend() {
    return Padding(
      padding: const EdgeInsets.only(top: 16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          _buildLegendItem('Ready', const Color(0xFF10B981)),
          const SizedBox(width: 24),
          _buildLegendItem('Broken', const Color(0xFFEF4444)),
        ],
      ),
    );
  }

  Widget _buildLegendItem(String label, Color color) {
    return Row(
      children: [
        Container(width: 12, height: 12, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
        const SizedBox(width: 8),
        Text(label, style: const TextStyle(fontSize: 12, color: AppTheme.textLight)),
      ],
    );
  }

  Widget _buildBarChart(Map<String, dynamic> stats) {
    final List<dynamic> categoryStats = stats['categoryStats'] ?? [];
    
    if (categoryStats.isEmpty) {
      return const Center(child: Text('No category data'));
    }

    return BarChart(
      BarChartData(
        alignment: BarChartAlignment.spaceAround,
        maxY: categoryStats.map((e) => double.tryParse('${e['count']}') ?? 0).reduce((a, b) => a > b ? a : b) + 5,
        barTouchData: BarTouchData(enabled: true),
        titlesData: FlTitlesData(
          show: true,
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              getTitlesWidget: (value, meta) {
                if (value.toInt() >= 0 && value.toInt() < categoryStats.length) {
                  return Padding(
                    padding: const EdgeInsets.only(top: 8.0),
                    child: Text(
                      categoryStats[value.toInt()]['category'].toString(),
                      style: const TextStyle(fontSize: 10, color: AppTheme.textLight),
                    ),
                  );
                }
                return const Text('');
              },
            ),
          ),
          leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        ),
        gridData: const FlGridData(show: false),
        borderData: FlBorderData(show: false),
        barGroups: List.generate(categoryStats.length, (index) {
          final count = double.tryParse('${categoryStats[index]['count']}') ?? 0;
          return BarChartGroupData(
            x: index,
            barRods: [
              BarChartRodData(
                toY: count,
                color: AppTheme.primary,
                width: 16,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
              ),
            ],
          );
        }),
      ),
    );
  }

  Widget _buildStatCard(String label, String value, IconData icon, Color color1, Color color2) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [color1, color2],
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: color1.withOpacity(0.3),
            blurRadius: 12,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.2),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: Colors.white, size: 20),
          ),
          const SizedBox(height: 20),
          Text(
            value,
            style: const TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          Text(
            label,
            style: TextStyle(
              fontSize: 14,
              color: Colors.white.withOpacity(0.9),
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRecentActivity() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Recent Activity',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: AppTheme.textMain,
              ),
            ),
            TextButton(
              onPressed: () {},
              child: const Text('See All'),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: const Color(0xFFE2E8F0)),
          ),
          child: _notifications.isEmpty
            ? const Padding(
                padding: EdgeInsets.all(32),
                child: Center(child: Text('No activity found')),
              )
            : ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _notifications.length > 5 ? 5 : _notifications.length,
                separatorBuilder: (context, index) => const Divider(height: 1, color: Color(0xFFF1F5F9)),
                itemBuilder: (context, index) {
                  final notif = _notifications[index];
                  bool isRead = notif['is_read'] == true;
                  
                  return Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: isRead ? Colors.transparent : Colors.blue.withOpacity(0.05),
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: Colors.blue.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Icon(Icons.info_outline, color: Colors.blue, size: 22),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                notif['title'] ?? 'Notification',
                                style: TextStyle(
                                  fontWeight: isRead ? FontWeight.normal : FontWeight.bold,
                                  fontSize: 14,
                                  color: AppTheme.textMain,
                                ),
                              ),
                              Text(
                                notif['message'] ?? '',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: AppTheme.textLight,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const Icon(Icons.chevron_right, color: AppTheme.textLight, size: 18),
                      ],
                    ),
                  );
                },
              ),
        ),
      ],
    );
  }
}
